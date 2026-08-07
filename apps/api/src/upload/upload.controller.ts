import {
  Body,
  Controller,
  HttpException,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { CloudinaryService } from "../cloudinary/cloudinary.module";

@Controller()
export class UploadController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  /** Upload a document to Cloudinary; optionally delete previous_key first. */
  @Post("upload-document")
  @UseInterceptors(FileInterceptor("file"))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { folder?: string; previous_key?: string },
  ) {
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
      const folderStr = body.folder?.trim();
      if (!folderStr) {
        throw new HttpException(
          {
            error:
              "Missing 'folder'. Provide the Cloudinary folder name for this document.",
          },
          400,
        );
      }
      const previousKeyStr = body.previous_key?.trim() || null;
      if (previousKeyStr) {
        try {
          await this.cloudinary.deleteDocument(previousKeyStr);
        } catch (err) {
          console.warn("Could not delete previous document:", err);
        }
      }
      const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "pdf";
      const publicId = `${randomUUID()}.${ext}`;
      const { url, key } = await this.cloudinary.uploadDocument(
        {
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
          size: file.size,
        },
        publicId,
        folderStr,
      );
      return { url, key };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const err = error as Error;
      if (err.message?.includes("Invalid file type") || err.message?.includes("File size")) {
        throw new HttpException({ error: err.message }, 400);
      }
      console.error("Document upload error:", error);
      throw new HttpException(
        { error: "Failed to upload document. Please try again." },
        500,
      );
    }
  }
}
