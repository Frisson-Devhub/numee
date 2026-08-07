import {
  Controller,
  Get,
  HttpException,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import * as XLSX from "xlsx";
import { hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.module";
import { MailService } from "../mail/mail.module";
import { SessionGuard } from "../common/guards/session.guard";
import { AdminGuard } from "../common/guards/admin.guard";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 100;
const SALT_ROUNDS = 10;
const PASSWORD_LENGTH = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL_REGEX.test(value.trim());
}

/** Cryptographically random password for bulk-onboarded students. */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(PASSWORD_LENGTH);
  let s = "";
  for (let i = 0; i < PASSWORD_LENGTH; i++) s += chars[bytes[i]! % chars.length];
  return s;
}

type ParsedRow = { firstName: string; lastName: string; email: string };

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, "");
}

/** Parse first sheet of an XLSX/CSV buffer into onboard rows (skips invalid emails). */
function parseBuffer(buffer: Buffer): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return rows;
  const sheet = wb.Sheets[firstSheet];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (raw.length === 0) return rows;
  const first = raw[0] as Record<string, unknown>;
  const keyMap: { first: string; last: string; email: string } = {
    first: "firstName",
    last: "lastName",
    email: "email",
  };
  for (const k of Object.keys(first)) {
    const n = normalizeKey(k);
    if (n === "firstname" || n === "first_name") keyMap.first = k;
    else if (n === "lastname" || n === "last_name") keyMap.last = k;
    else if (n === "email") keyMap.email = k;
  }
  for (const r of raw) {
    const firstName = String(r[keyMap.first] ?? "").trim();
    const lastName = String(r[keyMap.last] ?? "").trim();
    const email = String(r[keyMap.email] ?? "").trim();
    if (!email) continue;
    const emailLower = email.toLowerCase();
    if (emailLower === "email" || !isValidEmail(email)) continue;
    rows.push({ firstName: firstName || "User", lastName: lastName || "", email: emailLower });
  }
  return rows;
}

@Controller("admin")
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly mail: MailService,
  ) {}

  /** Paginated student user list (excludes ADMIN/RECRUITER). Admin session required. */
  @Get("users")
  async users(
    @Query("page") pageParam?: string,
    @Query("perPage") perPageParam?: string,
    @Query("search") searchParam?: string,
    @Query("role") roleParam?: string,
  ) {
    try {
      const page = Math.max(1, parseInt(pageParam ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE);
      const perPage = Math.min(
        MAX_PER_PAGE,
        Math.max(1, parseInt(perPageParam ?? String(DEFAULT_PER_PAGE), 10) || DEFAULT_PER_PAGE),
      );
      const search = searchParam?.trim() ?? "";
      const roleFilter = roleParam?.trim().toUpperCase() ?? "";

      // Students only — exclude ADMIN and RECRUITER from the admin user list
      const andConditions: Prisma.UserWhereInput[] = [
        { role: { notIn: ["ADMIN", "RECRUITER"] } },
      ];
      if (search) {
        andConditions.push({
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { emailOrPhone: { contains: search, mode: "insensitive" } },
          ],
        });
      }
      if (roleFilter === "STUDENT") andConditions.push({ role: "STUDENT" });

      const where: Prisma.UserWhereInput = { AND: andConditions };
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            emailOrPhone: true,
            role: true,
            lastLogin: true,
            createdAt: true,
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        users,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      };
    } catch (error) {
      console.error("Admin users fetch error:", error);
      throw new HttpException({ error: "Failed to fetch users." }, 500);
    }
  }

  /** Upload spreadsheet, create student accounts with generated passwords, email credentials. */
  @Post("bulk-onboard")
  @UseInterceptors(FileInterceptor("file"))
  async bulkOnboard(@UploadedFile() file?: Express.Multer.File) {
    if (!this.cloudinary.isConfigured()) {
      throw new HttpException({ error: "Cloudinary is not configured" }, 503);
    }
    try {
      if (!file) {
        throw new HttpException(
          { error: "Missing or invalid file. Use field name 'file'." },
          400,
        );
      }
      const buffer = file.buffer;
      const publicId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "xlsx";
      const { url } = await this.cloudinary.uploadBulkFile(
        {
          buffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
          size: file.size,
        },
        `${publicId}.${ext}`,
        "bulk-onboard",
      );

      const parsed = parseBuffer(buffer);
      const seen = new Set<string>();
      const created: string[] = [];
      const skipped: string[] = [];
      const errors: Array<{ email: string; reason: string }> = [];

      for (const row of parsed) {
        const email = row.email.toLowerCase();
        if (seen.has(email)) {
          skipped.push(email);
          continue;
        }
        seen.add(email);
        const existing = await this.prisma.user.findUnique({
          where: { emailOrPhone: email },
        });
        if (existing) {
          skipped.push(email);
          continue;
        }
        const password = generatePassword();
        const passwordHash = await hash(password, SALT_ROUNDS);
        try {
          await this.prisma.user.create({
            data: {
              firstName: row.firstName,
              lastName: row.lastName,
              emailOrPhone: email,
              passwordHash,
              role: "STUDENT",
            },
          });
          created.push(email);
          await this.mail.sendBulkOnboardEmail(email, row.firstName, password);
        } catch (err) {
          errors.push({
            email,
            reason: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        fileUrl: url,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length,
        details: { created, skipped, errors },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const err = error as Error;
      if (err.message?.includes("Invalid file type") || err.message?.includes("File size")) {
        throw new HttpException({ error: err.message }, 400);
      }
      console.error("Bulk onboard error:", error);
      throw new HttpException({ error: "Bulk onboard failed. Please try again." }, 500);
    }
  }
}
