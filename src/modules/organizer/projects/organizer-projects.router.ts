import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  createTaskSchema,
  updateProjectStatusSchema,
  updateTaskStatusSchema,
} from "./organizer-projects.schema";
import {
  createTask,
  deleteTask,
  getKanban,
  getOrganizerProjectById,
  getTask,
  listOrganizerProjects,
  updateProjectStatus,
  updateTask,
  updateTaskStatus,
} from "./organizer-projects.service";

export const organizerProjectsRouter = Router();
organizerProjectsRouter.use(authenticate, requireRole("organizer", "admin"));

// GET /api/organizer/projects
organizerProjectsRouter.get("/projects", async (req: Request, res: Response) => {
  const data = await listOrganizerProjects(req.user!.userId);
  sendSuccess(res, { data });
});

// GET /api/organizer/projects/:projectId/kanban
organizerProjectsRouter.get("/projects/:projectId/kanban", async (req: Request, res: Response) => {
  const data = await getKanban(p(req, "projectId"), req.user!.userId);
  sendSuccess(res, { data });
});

// PATCH /api/organizer/projects/:projectId/status
organizerProjectsRouter.patch(
  "/projects/:projectId/status",
  validate(updateProjectStatusSchema),
  async (req: Request, res: Response) => {
    const data = await updateProjectStatus(p(req, "projectId"), req.user!.userId, req.body);
    sendSuccess(res, { data });
  },
);

// POST /api/organizer/tasks
organizerProjectsRouter.post(
  "/tasks",
  validate(createTaskSchema),
  async (req: Request, res: Response) => {
    const data = await createTask(req.body, req.user!.userId, req.user!.userId);
    sendSuccess(res, { data, status: 201 });
  },
);

// GET /api/organizer/tasks/:taskId
organizerProjectsRouter.get("/tasks/:taskId", async (req: Request, res: Response) => {
  const data = await getTask(p(req, "taskId"), req.user!.userId);
  sendSuccess(res, { data });
});

// PUT /api/organizer/tasks/:taskId
organizerProjectsRouter.put("/tasks/:taskId", async (req: Request, res: Response) => {
  const data = await updateTask(p(req, "taskId"), req.body, req.user!.userId);
  sendSuccess(res, { data });
});

// PATCH /api/organizer/tasks/:taskId/status
organizerProjectsRouter.patch(
  "/tasks/:taskId/status",
  validate(updateTaskStatusSchema),
  async (req: Request, res: Response) => {
    const data = await updateTaskStatus(p(req, "taskId"), req.body, req.user!.userId, req.user!.userId);
    sendSuccess(res, { data });
  },
);

// DELETE /api/organizer/tasks/:taskId
organizerProjectsRouter.delete("/tasks/:taskId", async (req: Request, res: Response) => {
  await deleteTask(p(req, "taskId"), req.user!.userId);
  sendSuccess(res, { data: { deleted: true } });
});

// GET /api/organizer/projects/:projectId
organizerProjectsRouter.get("/projects/:projectId", async (req: Request, res: Response) => {
  const data = await getOrganizerProjectById(p(req, "projectId"), req.user!.userId);
  sendSuccess(res, { data });
});
