import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { p, q } from "../../utils/request";
import { sendSuccess } from "../../utils/response";
import {
  deleteChatMessage,
  getChatMessages,
  getCustomerContracts,
  getCustomerDashboard,
  getCustomerDocuments,
  getCustomerEventById,
  getCustomerEvents,
  getCustomerReviews,
  getCustomerTransactions,
  getEventMilestones,
  sendChatMessage,
  submitReview,
} from "./customer.service";

export const customerRouter = Router();
customerRouter.use(authenticate, requireRole("customer", "admin"));

// GET /api/customer/dashboard
customerRouter.get("/dashboard", async (req: Request, res: Response) => {
  const data = await getCustomerDashboard(req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/customer/events
customerRouter.get("/events", async (req: Request, res: Response) => {
  const data = await getCustomerEvents(req.user!.userId, {
    status: q(req, "status"),
    upcomingOnly: q(req, "upcomingOnly"),
  });
  sendSuccess(res, { data });
});

// GET /api/customer/events/:eventId
customerRouter.get("/events/:eventId", async (req: Request, res: Response) => {
  const data = await getCustomerEventById(p(req, "eventId"), req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/customer/events/:eventId/milestones
customerRouter.get("/events/:eventId/milestones", async (req: Request, res: Response) => {
  const data = await getEventMilestones(p(req, "eventId"), req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/customer/events/:eventId/chat-messages
customerRouter.get("/events/:eventId/chat-messages", async (req: Request, res: Response) => {
  const data = await getChatMessages(
    p(req, "eventId"),
    req.user!.userId,
    q(req, "cursor"),
    req.query.limit ? Number(req.query.limit) : 30,
  );
  sendSuccess(res, { data });
});

// POST /api/customer/events/:eventId/chat-messages
customerRouter.post("/events/:eventId/chat-messages", async (req: Request, res: Response) => {
  const data = await sendChatMessage(p(req, "eventId"), req.user!.userId, req.body);
  sendSuccess(res, { data, status: 201 });
});

// DELETE /api/customer/events/:eventId/chat-messages/:messageId
customerRouter.delete("/events/:eventId/chat-messages/:messageId", async (req: Request, res: Response) => {
  const data = await deleteChatMessage(p(req, "eventId"), p(req, "messageId"), req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/customer/contracts
customerRouter.get("/contracts", async (req: Request, res: Response) => {
  const data = await getCustomerContracts(req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/customer/transactions
customerRouter.get("/transactions", async (req: Request, res: Response) => {
  const data = await getCustomerTransactions(req.user!.userId);
  sendSuccess(res, { data });
});

// POST /api/customer/reviews
customerRouter.post("/reviews", async (req: Request, res: Response) => {
  const data = await submitReview(req.user!.userId, req.body);
  sendSuccess(res, { data, status: 201 });
});

// GET /api/customer/reviews
customerRouter.get("/reviews", async (req: Request, res: Response) => {
  const data = await getCustomerReviews(req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/customer/documents
customerRouter.get("/documents", async (req: Request, res: Response) => {
  const data = await getCustomerDocuments(req.user!.userId);
  sendSuccess(res, { data });
});
