import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  staffSchema,
  shiftSchema,
  listStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffShifts,
  createShift,
  getSchedule,
} from "./admin-staff.service";

export const adminStaffRouter = Router();
adminStaffRouter.use(authenticate);

// GET /api/admin/staff  (also used by organizer)
adminStaffRouter.get(
  "/",
  requireRole("admin", "organizer"),
  async (req: Request, res: Response) => {
    const pg = parsePagination(req, "displayName");
    const { items, total } = await listStaff({
      status: q(req, "status"),
      search: q(req, "search"),
      skip: pg.skip,
      take: pg.take,
    });
    sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
  },
);

// GET /api/admin/staff/schedule
adminStaffRouter.get(
  "/schedule",
  requireRole("admin", "organizer"),
  async (req: Request, res: Response) => {
    const data = await getSchedule(q(req, "startDate"), q(req, "endDate"));
    sendSuccess(res, { data });
  },
);

// GET /api/admin/staff/:id
adminStaffRouter.get(
  "/:id",
  requireRole("admin", "organizer"),
  async (req: Request, res: Response) => {
    const data = await getStaffById(p(req, "id"));
    sendSuccess(res, { data });
  },
);

// POST /api/admin/staff
adminStaffRouter.post(
  "/",
  requireRole("admin"),
  validate(staffSchema),
  async (req: Request, res: Response) => {
    const data = await createStaff(req.body);
    sendSuccess(res, { data, status: 201 });
  },
);

// PUT /api/admin/staff/:id
adminStaffRouter.put(
  "/:id",
  requireRole("admin"),
  validate(staffSchema.partial()),
  async (req: Request, res: Response) => {
    const data = await updateStaff(p(req, "id"), req.body);
    sendSuccess(res, { data });
  },
);

// DELETE /api/admin/staff/:id
adminStaffRouter.delete(
  "/:id",
  requireRole("admin"),
  async (req: Request, res: Response) => {
    const data = await deleteStaff(p(req, "id"));
    sendSuccess(res, { data });
  },
);

// GET /api/admin/staff/:id/shifts
adminStaffRouter.get(
  "/:id/shifts",
  requireRole("admin", "organizer"),
  async (req: Request, res: Response) => {
    const data = await getStaffShifts(p(req, "id"));
    sendSuccess(res, { data });
  },
);

// POST /api/admin/staff/:id/shifts
adminStaffRouter.post(
  "/:id/shifts",
  requireRole("admin"),
  validate(shiftSchema),
  async (req: Request, res: Response) => {
    const data = await createShift(p(req, "id"), req.body);
    sendSuccess(res, { data, status: 201 });
  },
);
