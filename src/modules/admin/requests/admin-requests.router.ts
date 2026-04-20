import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import { assignManagerSchema, updateRequestStatusSchema } from "./admin-requests.schema";
import {
  assignManager,
  deleteRequest,
  getRequestById,
  listRequests,
  updateRequestStatus,
} from "./admin-requests.service";

export const adminRequestsRouter = Router();
adminRequestsRouter.use(authenticate, requireRole("admin"));

// GET /api/admin/requests
adminRequestsRouter.get("/", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await listRequests({
    status: q(req, "status"),
    search: q(req, "search"),
    managerId: q(req, "managerId"),
    skip: pg.skip,
    take: pg.take,
    sortBy: pg.sortBy,
    sortOrder: pg.sortOrder,
  });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

// GET /api/admin/requests/:id
adminRequestsRouter.get("/:id", async (req: Request, res: Response) => {
  const data = await getRequestById(p(req, "id"));
  sendSuccess(res, { data });
});

// PATCH /api/admin/requests/:id/assign-manager
adminRequestsRouter.patch(
  "/:id/assign-manager",
  validate(assignManagerSchema),
  async (req: Request, res: Response) => {
    const data = await assignManager(p(req, "id"), req.body);
    sendSuccess(res, { data });
  },
);

// PATCH /api/admin/requests/:id/status
adminRequestsRouter.patch(
  "/:id/status",
  validate(updateRequestStatusSchema),
  async (req: Request, res: Response) => {
    const data = await updateRequestStatus(p(req, "id"), req.body);
    sendSuccess(res, { data });
  },
);

// DELETE /api/admin/requests/:id
adminRequestsRouter.delete("/:id", async (req: Request, res: Response) => {
  await deleteRequest(p(req, "id"));
  sendSuccess(res, { data: { deleted: true } });
});
