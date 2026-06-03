import { Request, Response, Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  upload,
  uploadDoc,
  uploadToCloudinary,
  uploadDocumentToCloudinary,
} from "../../lib/cloudinary";
import { sendSuccess } from "../../utils/response";
import { createError } from "../../middleware/errorHandler";

export const uploadRouter = Router();
uploadRouter.use(authenticate);

/**
 * POST /api/upload/image
 * Body: multipart/form-data { file: File, folder?: string }
 * Returns: { url: string }
 */
uploadRouter.post(
  "/image",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError("VALIDATION_ERROR", "No file uploaded", 400);
    }

    const folder = `nichan/${String(req.body.folder ?? "general").replace(/[^a-zA-Z0-9-_/]/g, "")}`;
    const url = await uploadToCloudinary(req.file.buffer, folder, req.file.originalname);

    sendSuccess(res, { data: { url: toPublicUrl(req, url) }, status: 201 });
  },
);

/**
 * POST /api/upload/avatar
 * Body: multipart/form-data { file: File }
 * Uploads to nichan/avatars
 */
uploadRouter.post(
  "/avatar",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError("VALIDATION_ERROR", "No file uploaded", 400);
    }

    const url = await uploadToCloudinary(req.file.buffer, "nichan/avatars", req.file.originalname);
    sendSuccess(res, { data: { url: toPublicUrl(req, url) }, status: 201 });
  },
);

/**
 * POST /api/upload/file
 * Body: multipart/form-data { file: File, folder?: string }
 * Cho phép ảnh + PDF/Word/Excel. Dùng cho đính kèm trong chat.
 * Returns: { url, type, name }
 */
uploadRouter.post(
  "/file",
  uploadDoc.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError("VALIDATION_ERROR", "No file uploaded", 400);
    }

    const folder = `nichan/${String(req.body.folder ?? "chat").replace(/[^a-zA-Z0-9-_/]/g, "")}`;
    const url = await uploadDocumentToCloudinary(req.file.buffer, folder, req.file.originalname);

    sendSuccess(res, {
      data: { url: toPublicUrl(req, url), type: req.file.mimetype, name: req.file.originalname },
      status: 201,
    });
  },
);

const toPublicUrl = (req: Request, url: string) => {
  if (!url.startsWith("/")) return url;
  return `${req.protocol}://${req.get("host")}${url}`;
};
