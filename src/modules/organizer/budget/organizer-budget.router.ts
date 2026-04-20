import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  budgetItemSchema,
  getProjectBudget,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
} from "./organizer-budget.service";

export const organizerBudgetRouter = Router();
organizerBudgetRouter.use(authenticate, requireRole("organizer", "admin"));

// GET /api/organizer/budgets/:projectId
organizerBudgetRouter.get("/budgets/:projectId", async (req: Request, res: Response) => {
  const data = await getProjectBudget(p(req, "projectId"));
  sendSuccess(res, { data });
});

// POST /api/organizer/budget-items
organizerBudgetRouter.post(
  "/budget-items",
  validate(budgetItemSchema),
  async (req: Request, res: Response) => {
    const data = await createBudgetItem(req.body);
    sendSuccess(res, { data, status: 201 });
  },
);

// PUT /api/organizer/budget-items/:id
organizerBudgetRouter.put(
  "/budget-items/:id",
  validate(budgetItemSchema.partial()),
  async (req: Request, res: Response) => {
    const data = await updateBudgetItem(p(req, "id"), req.body);
    sendSuccess(res, { data });
  },
);

// DELETE /api/organizer/budget-items/:id
organizerBudgetRouter.delete("/budget-items/:id", async (req: Request, res: Response) => {
  await deleteBudgetItem(p(req, "id"));
  sendSuccess(res, { data: { deleted: true } });
});
