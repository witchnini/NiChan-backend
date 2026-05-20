import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  createTaskSchema,
  updateTaskStatusSchema,
} from "../../organizer/projects/organizer-projects.schema";
import {
  createTask,
  deleteTask,
  getTask,
  updateTask,
  updateTaskStatus,
} from "../../organizer/projects/organizer-projects.service";
import {
  adminProjectNameSchema,
  adminProjectOrganizerSchema,
  adminProjectStatusSchema,
} from "./admin-projects.schema";
import {
  getAdminKanban,
  getAdminProjectById,
  listAdminProjects,
  updateAdminProjectName,
  updateAdminProjectOrganizer,
  updateAdminProjectStatus,
} from "./admin-projects.service";

export const adminProjectsRouter = Router();
adminProjectsRouter.use(authenticate, requireRole("admin"));

// GET /api/admin/projects
adminProjectsRouter.get("/", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await listAdminProjects({
    status: q(req, "status"),
    organizerId: q(req, "organizerId"),
    search: q(req, "search"),
    skip: pg.skip,
    take: pg.take,
    sortBy: pg.sortBy,
    sortOrder: pg.sortOrder,
  });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

// POST /api/admin/projects/tasks
adminProjectsRouter.post(
  "/tasks",
  validate(createTaskSchema),
  async (req: Request, res: Response) => {
    const data = await createTask(req.body, req.user!.userId);
    sendSuccess(res, { data, status: 201 });
  },
);

// GET /api/admin/projects/tasks/:taskId
adminProjectsRouter.get("/tasks/:taskId", async (req: Request, res: Response) => {
  const data = await getTask(p(req, "taskId"));
  sendSuccess(res, { data });
});

// PUT /api/admin/projects/tasks/:taskId
adminProjectsRouter.put("/tasks/:taskId", async (req: Request, res: Response) => {
  const data = await updateTask(p(req, "taskId"), req.body);
  sendSuccess(res, { data });
});

// PATCH /api/admin/projects/tasks/:taskId/status
adminProjectsRouter.patch(
  "/tasks/:taskId/status",
  validate(updateTaskStatusSchema),
  async (req: Request, res: Response) => {
    const data = await updateTaskStatus(p(req, "taskId"), req.body, req.user!.userId);
    sendSuccess(res, { data });
  },
);

// DELETE /api/admin/projects/tasks/:taskId
adminProjectsRouter.delete("/tasks/:taskId", async (req: Request, res: Response) => {
  await deleteTask(p(req, "taskId"));
  sendSuccess(res, { data: { deleted: true } });
});

// GET /api/admin/projects/:projectId
adminProjectsRouter.get("/:projectId", async (req: Request, res: Response) => {
  const data = await getAdminProjectById(p(req, "projectId"));
  sendSuccess(res, { data });
});

// GET /api/admin/projects/:projectId/kanban
adminProjectsRouter.get("/:projectId/kanban", async (req: Request, res: Response) => {
  const data = await getAdminKanban(p(req, "projectId"));
  sendSuccess(res, { data });
});

// PATCH /api/admin/projects/:projectId/status
adminProjectsRouter.patch(
  "/:projectId/status",
  validate(adminProjectStatusSchema),
  async (req: Request, res: Response) => {
    const data = await updateAdminProjectStatus(p(req, "projectId"), req.user!.userId, req.body);
    sendSuccess(res, { data });
  },
);

// PATCH /api/admin/projects/:projectId/name
adminProjectsRouter.patch(
  "/:projectId/name",
  validate(adminProjectNameSchema),
  async (req: Request, res: Response) => {
    const data = await updateAdminProjectName(p(req, "projectId"), req.user!.userId, req.body);
    sendSuccess(res, { data });
  },
);

// PATCH /api/admin/projects/:projectId/organizer
adminProjectsRouter.patch(
  "/:projectId/organizer",
  validate(adminProjectOrganizerSchema),
  async (req: Request, res: Response) => {
    const data = await updateAdminProjectOrganizer(p(req, "projectId"), req.body);
    sendSuccess(res, { data });
  },
);
