import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  staffAssignBodySchema,
  staffAssignUpdateSchema,
  listAvailableStaff,
  getEventStaff,
  assignStaffToEvent,
  updateStaffAssignment,
  removeStaffFromEvent,
  getStaffShiftsForOrganizer,
} from "./organizer-staff.service";
import { createStaff, staffSchema } from "../../admin/staff/admin-staff.service";

export const organizerStaffRouter = Router();
organizerStaffRouter.use(authenticate, requireRole("organizer", "admin"));

// POST /api/organizer/staff — create a new staff account
organizerStaffRouter.post(
  "/",
  validate(staffSchema),
  async (req: Request, res: Response) => {
    const data = await createStaff(req.body);
    sendSuccess(res, { data, status: 201 });
  },
);

// GET /api/organizer/staff — list available staff for organizer to assign
organizerStaffRouter.get("/", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "displayName");
  const { items, total } = await listAvailableStaff({
    search: q(req, "search"),
    skip: pg.skip,
    take: pg.take,
  });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

// GET /api/organizer/staff/shifts — read-only shifts for organizer's events
organizerStaffRouter.get("/shifts", async (req: Request, res: Response) => {
  const data = await getStaffShiftsForOrganizer(req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/organizer/staff/events/:eventId — staff assignments for a specific event
organizerStaffRouter.get("/events/:eventId", async (req: Request, res: Response) => {
  const data = await getEventStaff(p(req, "eventId"), req.user!.userId, req.user!.role);
  sendSuccess(res, { data });
});

// POST /api/organizer/staff/events/:eventId — assign staff to event
organizerStaffRouter.post(
  "/events/:eventId",
  validate(staffAssignBodySchema),
  async (req: Request, res: Response) => {
    const data = await assignStaffToEvent(
      { ...req.body, eventId: p(req, "eventId") },
      req.user!.userId,
      req.user!.role,
    );
    sendSuccess(res, { data, status: 201 });
  },
);

// PATCH /api/organizer/staff/assignments/:id — update assignment status
organizerStaffRouter.patch(
  "/assignments/:id",
  validate(staffAssignUpdateSchema),
  async (req: Request, res: Response) => {
    const data = await updateStaffAssignment(
      p(req, "id"),
      req.body,
      req.user!.userId,
      req.user!.role,
    );
    sendSuccess(res, { data });
  },
);

// DELETE /api/organizer/staff/assignments/:id — remove staff from event
organizerStaffRouter.delete("/assignments/:id", async (req: Request, res: Response) => {
  await removeStaffFromEvent(p(req, "id"), req.user!.userId, req.user!.role);
  sendSuccess(res, { data: { removed: true } });
});
