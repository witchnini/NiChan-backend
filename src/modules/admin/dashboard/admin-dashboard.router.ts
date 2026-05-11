import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  getAdminDashboard,
  getAdminNotifications,
  markAdminNotificationRead,
} from "./admin-dashboard.service";

export const adminDashboardRouter = Router();
adminDashboardRouter.use(authenticate, requireRole("admin"));

// GET /api/admin/dashboard
adminDashboardRouter.get("/dashboard", async (_req: Request, res: Response) => {
  const data = await getAdminDashboard();
  sendSuccess(res, { data });
});

// GET /api/admin/notifications
adminDashboardRouter.get("/notifications", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await getAdminNotifications(req.user!.userId, {
    read: q(req, "read"),
    type: q(req, "type"),
    skip: pg.skip,
    take: pg.take,
  });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

// PATCH /api/admin/notifications/:id/read
adminDashboardRouter.patch("/notifications/:id/read", async (req: Request, res: Response) => {
  const data = await markAdminNotificationRead(p(req, "id"), req.user!.userId);
  sendSuccess(res, { data });
});
