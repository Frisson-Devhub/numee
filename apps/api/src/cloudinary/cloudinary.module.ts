import { Global, Injectable, Module } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const BULK_UPLOAD_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const EXT_TO_MIME: Record<string, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
};

export type UploadableFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
    const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.configured = true;
    }
  }

  /** True when Cloudinary env credentials were present at boot. */
  isConfigured(): boolean {
    return this.configured;
  }

  /** Upload PDF/DOC/DOCX as raw; enforces 5MB and MIME allowlist. */
  async uploadDocument(
    file: UploadableFile,
    publicId: string,
    folder: string,
  ): Promise<{ key: string; url: string }> {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary is not configured");
    }
    const type = file.mimetype;
    if (!ACCEPTED_DOCUMENT_TYPES.includes(type)) {
      throw new Error("Invalid file type. Allowed: PDF, DOC, DOCX");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("File size must be 5 MB or less");
    }
    const normalizedFolder =
      folder.trim().replace(/^\/+|\/+$/g, "") || "documents";
    const base64 = file.buffer.toString("base64");
    const dataUri = `data:${type};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "raw",
      folder: normalizedFolder,
      public_id: publicId,
    });
    return { key: result.public_id, url: result.secure_url };
  }

  /** Upload image asset; enforces 5MB and image MIME allowlist. */
  async uploadImage(
    file: UploadableFile,
    publicId: string,
    folder: string,
  ): Promise<{ key: string; url: string }> {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary is not configured");
    }
    const type = file.mimetype;
    if (!ACCEPTED_IMAGE_TYPES.includes(type)) {
      throw new Error("Invalid file type. Allowed: JPEG, PNG, WEBP, GIF");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("File size must be 5 MB or less");
    }
    const normalizedFolder =
      folder.trim().replace(/^\/+|\/+$/g, "") || "images";
    const base64 = file.buffer.toString("base64");
    const dataUri = `data:${type};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "image",
      folder: normalizedFolder,
      public_id: publicId,
    });
    return { key: result.public_id, url: result.secure_url };
  }

  /** Upload CSV/XLSX used by admin bulk onboard (kept for audit). */
  async uploadBulkFile(
    file: UploadableFile,
    publicId: string,
    folder: string,
  ): Promise<{ key: string; url: string }> {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary is not configured");
    }
    let type = file.mimetype;
    if (!type && file.originalname) {
      const ext = file.originalname.split(".").pop()?.toLowerCase();
      type = ext ? EXT_TO_MIME[ext] ?? "" : "";
    }
    if (!type || !BULK_UPLOAD_TYPES.includes(type)) {
      throw new Error("Invalid file type. Allowed: CSV, XLSX, XLS");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("File size must be 5 MB or less");
    }
    const normalizedFolder =
      folder.trim().replace(/^\/+|\/+$/g, "") || "bulk-uploads";
    const base64 = file.buffer.toString("base64");
    const dataUri = `data:${type};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "raw",
      folder: normalizedFolder,
      public_id: publicId,
    });
    return { key: result.public_id, url: result.secure_url };
  }

  /** Destroy a raw asset by public_id (best-effort for replace-upload). */
  async deleteDocument(publicId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary is not configured");
    }
    if (!publicId?.trim()) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  }
}

@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
