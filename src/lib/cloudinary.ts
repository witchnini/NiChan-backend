import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

// Multer: lưu file vào RAM, sau đó upload lên Cloudinary
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Multer cho tài liệu: ngoài ảnh còn cho phép PDF / Word / Excel
export const uploadDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image or document files are allowed"));
    }
  },
});

/**
 * Upload buffer lên Cloudinary, trả về secure_url
 * @param buffer  - file buffer từ multer
 * @param folder  - thư mục trên Cloudinary, ví dụ "nichan/avatars"
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  originalName = "image.jpg",
): Promise<string> => {
  const hasCloudinaryConfig = Boolean(
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret,
  );

  if (!hasCloudinaryConfig) {
    return uploadToLocalStorage(buffer, folder, originalName);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary"));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
};

/**
 * Upload tài liệu (PDF/Word/Excel/ảnh) lên Cloudinary với resource_type "auto".
 * Thiếu cấu hình Cloudinary thì fallback lưu nội bộ.
 */
export const uploadDocumentToCloudinary = (
  buffer: Buffer,
  folder: string,
  originalName = "document",
): Promise<string> => {
  const hasCloudinaryConfig = Boolean(
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret,
  );

  if (!hasCloudinaryConfig) {
    return uploadToLocalStorage(buffer, folder, originalName);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary"));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
};

const uploadToLocalStorage = async (
  buffer: Buffer,
  folder: string,
  originalName: string,
): Promise<string> => {
  const safeFolder = folder.replace(/[^a-zA-Z0-9-_/]/g, "");
  const extension = path.extname(originalName).toLowerCase() || ".jpg";
  const filename = `${randomUUID()}${extension}`;
  const targetDir = path.resolve(process.cwd(), "uploads", safeFolder);

  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, filename), buffer);

  return `/uploads/${safeFolder}/${filename}`.replace(/\\/g, "/");
};

export { cloudinary };
