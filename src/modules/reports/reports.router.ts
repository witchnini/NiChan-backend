import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { sendSuccess } from "../../utils/response";
import { q } from "../../utils/request";
import {
  getOrganizerProjectProgress,
  getOrganizerTaskCompletion,
  getOrganizerBudgetOverview,
  getOrganizerSummary,
  getOrganizerStaffPerformance,
  getAdminConversionReport,
  getAdminRevenueByType,
  getAdminTopEvents,
} from "./reports.service";

// ─── Organizer Reports ────────────────────────────────────────────────────────

export const organizerReportsRouter = Router();
organizerReportsRouter.use(authenticate, requireRole("organizer", "admin"));

organizerReportsRouter.get("/reports/project-progress", async (req: Request, res: Response) => {
  const data = await getOrganizerProjectProgress(req.user!.userId);
  sendSuccess(res, { data });
});

organizerReportsRouter.get("/reports/task-completion", async (req: Request, res: Response) => {
  const data = await getOrganizerTaskCompletion(req.user!.userId);
  sendSuccess(res, { data });
});

organizerReportsRouter.get("/reports/budget-overview", async (req: Request, res: Response) => {
  const data = await getOrganizerBudgetOverview(req.user!.userId);
  sendSuccess(res, { data });
});

organizerReportsRouter.get("/reports/summary", async (req: Request, res: Response) => {
  const data = await getOrganizerSummary(req.user!.userId);
  sendSuccess(res, { data });
});

organizerReportsRouter.get("/reports/staff-performance", async (req: Request, res: Response) => {
  const data = await getOrganizerStaffPerformance(req.user!.userId);
  sendSuccess(res, { data });
});

// ─── Admin Reports ────────────────────────────────────────────────────────────

export const adminReportsRouter = Router();
adminReportsRouter.use(authenticate, requireRole("admin"));

adminReportsRouter.get("/reports/conversion", async (_req: Request, res: Response) => {
  const data = await getAdminConversionReport();
  sendSuccess(res, { data });
});

adminReportsRouter.get("/reports/revenue-by-type", async (_req: Request, res: Response) => {
  const data = await getAdminRevenueByType();
  sendSuccess(res, { data });
});

adminReportsRouter.get("/reports/top-events", async (_req: Request, res: Response) => {
  const data = await getAdminTopEvents();
  sendSuccess(res, { data });
});
