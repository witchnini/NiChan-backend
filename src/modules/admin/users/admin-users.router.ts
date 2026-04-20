import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "./admin-users.schema";
import {
  createUser,
  getUserById,
  listUsers,
  softDeleteUser,
  updateUser,
  updateUserStatus,
} from "./admin-users.service";

export const adminUsersRouter = Router();
adminUsersRouter.use(authenticate, requireRole("admin"));

// GET /api/admin/users
adminUsersRouter.get("/", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await listUsers({
    role: q(req, "role"),
    status: q(req, "status"),
    search: q(req, "search"),
    skip: pg.skip,
    take: pg.take,
    sortOrder: pg.sortOrder,
  });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

// GET /api/admin/users/:id
adminUsersRouter.get("/:id", async (req: Request, res: Response) => {
  const data = await getUserById(p(req, "id"));
  sendSuccess(res, { data });
});

// POST /api/admin/users
adminUsersRouter.post(
  "/",
  validate(createUserSchema),
  async (req: Request, res: Response) => {
    const data = await createUser(req.body);
    sendSuccess(res, { data, status: 201 });
  },
);

// PUT /api/admin/users/:id
adminUsersRouter.put(
  "/:id",
  validate(updateUserSchema),
  async (req: Request, res: Response) => {
    const data = await updateUser(p(req, "id"), req.body);
    sendSuccess(res, { data });
  },
);

// PATCH /api/admin/users/:id/status
adminUsersRouter.patch(
  "/:id/status",
  validate(updateUserStatusSchema),
  async (req: Request, res: Response) => {
    const data = await updateUserStatus(p(req, "id"), req.body);
    sendSuccess(res, { data });
  },
);

// DELETE /api/admin/users/:id (soft delete)
adminUsersRouter.delete("/:id", async (req: Request, res: Response) => {
  await softDeleteUser(p(req, "id"));
  sendSuccess(res, { data: { deleted: true } });
});
