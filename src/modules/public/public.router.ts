import { Request, Response, Router } from "express";
import { parsePagination, buildMeta } from "../../utils/pagination";
import { sendSuccess } from "../../utils/response";
import {
  getBlogPostById,
  getBlogPosts,
  getPortfolio,
  getPortfolioBySlug,
  getReviewCriteria,
  getServiceBySlug,
  getServiceCategories,
  getServices,
  getTestimonials,
} from "./public.service";

export const publicRouter = Router();

// GET /api/public/service-categories
publicRouter.get("/service-categories", async (_req: Request, res: Response) => {
  const data = await getServiceCategories();
  sendSuccess(res, { data });
});

// GET /api/public/services
publicRouter.get("/services", async (req: Request, res: Response) => {
  const data = await getServices({
    category: req.query.category as string | undefined,
    search: req.query.search as string | undefined,
    featured: req.query.featured as string | undefined,
  });
  sendSuccess(res, { data });
});

// GET /api/public/services/:slug
publicRouter.get("/services/:slug", async (req: Request, res: Response) => {
  const data = await getServiceBySlug(String(req.params.slug));
  sendSuccess(res, { data });
});

// GET /api/public/portfolio
publicRouter.get("/portfolio", async (req: Request, res: Response) => {
  const data = await getPortfolio({
    category: req.query.category as string | undefined,
    visibleOnly: req.query.visibleOnly as string | undefined,
  });
  sendSuccess(res, { data });
});

// GET /api/public/portfolio/:slug
publicRouter.get("/portfolio/:slug", async (req: Request, res: Response) => {
  const data = await getPortfolioBySlug(String(req.params.slug));
  sendSuccess(res, { data });
});

// GET /api/public/blog-posts
publicRouter.get("/blog-posts", async (req: Request, res: Response) => {
  const pagination = parsePagination(req, "publishedAt");
  const { items, total } = await getBlogPosts(
    {
      category: req.query.category as string | undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
    },
    pagination.skip,
    pagination.take,
  );
  sendSuccess(res, { data: items, meta: buildMeta(pagination, total) });
});

// GET /api/public/blog-posts/:id
publicRouter.get("/blog-posts/:id", async (req: Request, res: Response) => {
  const data = await getBlogPostById(String(req.params.id));
  sendSuccess(res, { data });
});

// GET /api/public/testimonials
publicRouter.get("/testimonials", async (_req: Request, res: Response) => {
  const data = await getTestimonials();
  sendSuccess(res, { data });
});

// GET /api/public/review-criteria
publicRouter.get("/review-criteria", async (_req: Request, res: Response) => {
  const data = await getReviewCriteria();
  sendSuccess(res, { data });
});
