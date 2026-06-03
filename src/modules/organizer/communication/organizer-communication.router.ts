import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { uploadDoc, uploadDocumentToCloudinary } from "../../../lib/cloudinary";
import { createError } from "../../../middleware/errorHandler";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  createOrganizerDocument,
  deleteChatMessage,
  getChatMessages,
  getOrganizerEventDocuments,
  sendChatMessage,
} from "./organizer-communication.service";

export const organizerCommunicationRouter = Router();
organizerCommunicationRouter.use(authenticate, requireRole("organizer", "admin"));

// GET /api/organizer/events/:eventId/chat-messages
organizerCommunicationRouter.get(
  "/events/:eventId/chat-messages",
  async (req: Request, res: Response) => {
    const data = await getChatMessages(
      p(req, "eventId"),
      req.user!.userId,
      q(req, "cursor"),
      req.query.limit ? Number(req.query.limit) : 30,
    );
    sendSuccess(res, { data });
  },
);

// POST /api/organizer/events/:eventId/chat-messages
organizerCommunicationRouter.post(
  "/events/:eventId/chat-messages",
  async (req: Request, res: Response) => {
    const data = await sendChatMessage(p(req, "eventId"), req.user!.userId, req.body);
    sendSuccess(res, { data, status: 201 });
  },
);

// DELETE /api/organizer/events/:eventId/chat-messages/:messageId
organizerCommunicationRouter.delete(
  "/events/:eventId/chat-messages/:messageId",
  async (req: Request, res: Response) => {
    const data = await deleteChatMessage(p(req, "eventId"), p(req, "messageId"), req.user!.userId);
    sendSuccess(res, { data });
  },
);

// GET /api/organizer/events/:eventId/documents
organizerCommunicationRouter.get(
  "/events/:eventId/documents",
  async (req: Request, res: Response) => {
    const data = await getOrganizerEventDocuments(p(req, "eventId"), req.user!.userId);
    sendSuccess(res, { data });
  },
);

// POST /api/organizer/events/:eventId/documents — upload a document file
organizerCommunicationRouter.post(
  "/events/:eventId/documents",
  uploadDoc.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError("VALIDATION_ERROR", "No file uploaded", 400);
    }

    const fileUrl = await uploadDocumentToCloudinary(
      req.file.buffer,
      "nichan/documents",
      req.file.originalname,
    );

    const data = await createOrganizerDocument(p(req, "eventId"), req.user!.userId, {
      name: String(req.body.name || req.file.originalname),
      fileType: req.file.mimetype,
      fileUrl,
    });
    sendSuccess(res, { data, status: 201 });
  },
);
