import { Router } from "express";
import { sendSuccess } from "../../utils/response";

export const foundationRouter = Router();

// GET /api/health
foundationRouter.get("/health", (_req, res) => {
  sendSuccess(res, {
    data: {
      status: "ok",
      service: "nichan-backend",
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/meta/enums
foundationRouter.get("/meta/enums", (_req, res) => {
  sendSuccess(res, {
    data: {
      userRoles: ["admin", "organizer", "customer"],
      userStatuses: ["active", "inactive", "suspended"],
      requestStatuses: ["new", "reviewing", "quoted", "confirmed", "rejected"],
      eventStatuses: [
        "draft",
        "planning",
        "quoted",
        "contracted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      taskStatuses: ["todo", "in_progress", "review", "done"],
      taskPriorities: ["low", "medium", "high"],
      contractStatuses: ["draft", "sent", "active", "liquidated", "cancelled"],
      documentStatuses: ["pending", "approved", "signed", "rejected"],
      reviewStatuses: ["pending", "approved", "hidden"],
      vendorStatuses: ["active", "paused", "inactive"],
      budgetItemStatuses: ["planned", "approved", "committed", "paid"],
      blogStatuses: ["draft", "scheduled", "published", "hidden"],
      portfolioStatuses: ["visible", "hidden"],
    },
  });
});
