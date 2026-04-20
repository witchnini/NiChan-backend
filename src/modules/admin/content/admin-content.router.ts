import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../../middleware/auth";
import { validate } from "../../../middleware/validate";
import { buildMeta, parsePagination } from "../../../utils/pagination";
import { p, q } from "../../../utils/request";
import { sendSuccess } from "../../../utils/response";
import {
  portfolioSchema,
  blogPostSchema,
  listPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  listBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listReviews,
  approveReview,
  hideReview,
} from "./admin-content.service";

export const adminContentRouter = Router();
adminContentRouter.use(authenticate, requireRole("admin"));

// ─── Portfolio ────────────────────────────────────────────────────────────────

adminContentRouter.get("/portfolio", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await listPortfolio({ status: q(req, "status"), skip: pg.skip, take: pg.take });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

adminContentRouter.post("/portfolio", validate(portfolioSchema), async (req: Request, res: Response) => {
  const data = await createPortfolio(req.body, req.user!.userId);
  sendSuccess(res, { data, status: 201 });
});

adminContentRouter.put("/portfolio/:id", validate(portfolioSchema.partial()), async (req: Request, res: Response) => {
  const data = await updatePortfolio(p(req, "id"), req.body);
  sendSuccess(res, { data });
});

adminContentRouter.delete("/portfolio/:id", async (req: Request, res: Response) => {
  await deletePortfolio(p(req, "id"));
  sendSuccess(res, { data: { deleted: true } });
});

// ─── Blog Posts ───────────────────────────────────────────────────────────────

adminContentRouter.get("/blog-posts", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await listBlogPosts({ status: q(req, "status"), skip: pg.skip, take: pg.take });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

adminContentRouter.post("/blog-posts", validate(blogPostSchema), async (req: Request, res: Response) => {
  const data = await createBlogPost(req.body, req.user!.userId);
  sendSuccess(res, { data, status: 201 });
});

adminContentRouter.put("/blog-posts/:id", validate(blogPostSchema.partial()), async (req: Request, res: Response) => {
  const data = await updateBlogPost(p(req, "id"), req.body, req.user!.userId);
  sendSuccess(res, { data });
});

adminContentRouter.delete("/blog-posts/:id", async (req: Request, res: Response) => {
  await deleteBlogPost(p(req, "id"));
  sendSuccess(res, { data: { deleted: true } });
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

adminContentRouter.get("/reviews", async (req: Request, res: Response) => {
  const pg = parsePagination(req, "createdAt");
  const { items, total } = await listReviews({ status: q(req, "status"), skip: pg.skip, take: pg.take });
  sendSuccess(res, { data: items, meta: buildMeta(pg, total) });
});

adminContentRouter.patch("/reviews/:id/approve", async (req: Request, res: Response) => {
  const data = await approveReview(p(req, "id"), req.user!.userId);
  sendSuccess(res, { data });
});

adminContentRouter.patch("/reviews/:id/hide", async (req: Request, res: Response) => {
  const data = await hideReview(p(req, "id"));
  sendSuccess(res, { data });
});
