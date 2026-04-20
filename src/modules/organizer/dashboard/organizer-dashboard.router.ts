import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  getOrganizerDashboard,
  getOrganizerNotifications,
  markNotificationRead,
} from "./organizer-dashboard.service";

export const organizerDashboardRouter = Router();
organizerDashboardRouter.use(authenticate, requireRole("organizer", "admin"));

// GET /api/organizer/dashboard
organizerDashboardRouter.get("/dashboard", async (req: Request, res: Response) => {
  const data = await getOrganizerDashboard(req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/organizer/notifications
organizerDashboardRouter.get("/notifications", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await getOrganizerNotifications(req.user!.userId, {
    read: q(req, "read"),
    type: q(req, "type"),
    skip: pg.skip,
    take: pg.take,
  });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

// PATCH /api/organizer/notifications/:id/read
organizerDashboardRouter.patch(
  "/notifications/:id/read",
  async (req: Request, res: Response) => {
    const data = await markNotificationRead(p(req, "id"), req.user!.userId);
    sendSuccess(res, { data });
  },
);
