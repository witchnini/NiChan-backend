import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import { createContractSchema, updateContractSchema } from "./admin-contracts.schema";
import {
  createContract,
  deleteContract,
  getContractById,
  listContracts,
  sendContract,
  updateContract,
} from "./admin-contracts.service";

export const adminContractsRouter = Router();
adminContractsRouter.use(authenticate, requireRole("admin"));

// GET /api/admin/contracts
adminContractsRouter.get("/", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await listContracts({
    status: q(req, "status"),
    search: q(req, "search"),
    skip: pg.skip,
    take: pg.take,
    sortOrder: pg.sortOrder,
  });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

// GET /api/admin/contracts/:id
adminContractsRouter.get("/:id", async (req: Request, res: Response) => {
  const data = await getContractById(p(req, "id"));
  sendSuccess(res, { data });
});

// POST /api/admin/contracts
adminContractsRouter.post(
  "/",
  validate(createContractSchema),
  async (req: Request, res: Response) => {
    const data = await createContract(req.body, req.user!.userId);
    sendSuccess(res, { data, status: 201 });
  },
);

// PUT /api/admin/contracts/:id
adminContractsRouter.put(
  "/:id",
  validate(updateContractSchema),
  async (req: Request, res: Response) => {
    const data = await updateContract(p(req, "id"), req.body, req.user!.userId);
    sendSuccess(res, { data });
  },
);

// PATCH /api/admin/contracts/:id/send
adminContractsRouter.patch("/:id/send", async (req: Request, res: Response) => {
  const data = await sendContract(p(req, "id"));
  sendSuccess(res, { data });
});

// DELETE /api/admin/contracts/:id
adminContractsRouter.delete("/:id", async (req: Request, res: Response) => {
  await deleteContract(p(req, "id"));
  sendSuccess(res, { data: { deleted: true } });
});
