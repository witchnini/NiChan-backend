import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  vendorSchema,
  vendorCategorySchema,
  listVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
  listVendorCategories,
  createVendorCategory,
  updateVendorCategory,
} from "./admin-vendors.service";

export const adminVendorsRouter = Router();
adminVendorsRouter.use(authenticate, requireRole("admin"));

// ─── Vendor Categories ────────────────────────────────────────────────────────

// GET /api/admin/vendors/categories
adminVendorsRouter.get("/categories", async (_req: Request, res: Response) => {
  const data = await listVendorCategories();
  sendSuccess(res, { data });
});

// POST /api/admin/vendors/categories
adminVendorsRouter.post(
  "/categories",
  validate(vendorCategorySchema),
  async (req: Request, res: Response) => {
    const data = await createVendorCategory(req.body);
    sendSuccess(res, { data, status: 201 });
  },
);

// PATCH /api/admin/vendors/categories/:id
adminVendorsRouter.patch(
  "/categories/:id",
  validate(vendorCategorySchema.partial()),
  async (req: Request, res: Response) => {
    const data = await updateVendorCategory(p(req, "id"), req.body);
    sendSuccess(res, { data });
  },
);

// ─── Vendors ──────────────────────────────────────────────────────────────────

// GET /api/admin/vendors
adminVendorsRouter.get("/", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "name");
  const { items, total } = await listVendors({
    categoryId: q(req, "categoryId"),
    status: q(req, "status"),
    search: q(req, "search"),
    skip: pg.skip,
    take: pg.take,
    sortOrder: pg.sortOrder,
  });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

// GET /api/admin/vendors/:id
adminVendorsRouter.get("/:id", async (req: Request, res: Response) => {
  const data = await getVendorById(p(req, "id"));
  sendSuccess(res, { data });
});

// POST /api/admin/vendors
adminVendorsRouter.post(
  "/",
  validate(vendorSchema),
  async (req: Request, res: Response) => {
    const data = await createVendor(req.body);
    sendSuccess(res, { data, status: 201 });
  },
);

// PATCH /api/admin/vendors/:id
adminVendorsRouter.patch(
  "/:id",
  validate(vendorSchema.partial()),
  async (req: Request, res: Response) => {
    const data = await updateVendor(p(req, "id"), req.body);
    sendSuccess(res, { data });
  },
);

// PATCH /api/admin/vendors/:id/status
adminVendorsRouter.patch("/:id/status", async (req: Request, res: Response) => {
  const { status } = req.body as { status: string };
  const data = await updateVendorStatus(p(req, "id"), status);
  sendSuccess(res, { data });
});

// DELETE /api/admin/vendors/:id
adminVendorsRouter.delete("/:id", async (req: Request, res: Response) => {
  const data = await deleteVendor(p(req, "id"));
  sendSuccess(res, { data });
});
