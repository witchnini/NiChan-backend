import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const portfolioSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(100),
  guestCount: z.number().int().positive().optional().nullable(),
  coverImageUrl: z.string().url(),
  status: z.enum(["visible", "hidden"]).default("visible"),
  eventId: z.string().uuid().optional().nullable(),
  publishedAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const blogPostSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(100),
  excerpt: z.string().max(500).optional(),
  content: z.string().optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "hidden"]).default("draft"),
  publishedAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export type PortfolioInput = z.infer<typeof portfolioSchema>;
export type BlogPostInput = z.infer<typeof blogPostSchema>;

// ─── Portfolio ────────────────────────────────────────────────────────────────

const toSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 255);

export const listPortfolio = async (filters: {
  status?: string;
  skip: number;
  take: number;
}) => {
  const where = filters.status ? { status: filters.status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.portfolioItem.findMany({ where, skip: filters.skip, take: filters.take, orderBy: { createdAt: "desc" } }),
    prisma.portfolioItem.count({ where }),
  ]);
  return { items, total };
};

export const createPortfolio = async (input: PortfolioInput, createdById: string) => {
  const slug = input.slug ?? toSlug(input.title) + "-" + Date.now();
  return prisma.portfolioItem.create({
    data: {
      title: input.title,
      slug,
      category: input.category,
      guestCount: input.guestCount,
      coverImageUrl: input.coverImageUrl,
      status: input.status,
      eventId: input.eventId,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    },
  });
};

export const updatePortfolio = async (id: string, input: Partial<PortfolioInput>) => {
  const existing = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Portfolio item not found", 404);
  return prisma.portfolioItem.update({ where: { id }, data: input });
};

export const deletePortfolio = async (id: string) => {
  const existing = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Portfolio item not found", 404);
  await prisma.portfolioItem.delete({ where: { id } });
};

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export const listBlogPosts = async (filters: { status?: string; skip: number; take: number }) => {
  const where = filters.status ? { status: filters.status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.blogPost.findMany({ where, skip: filters.skip, take: filters.take, orderBy: { createdAt: "desc" } }),
    prisma.blogPost.count({ where }),
  ]);
  return { items, total };
};

export const createBlogPost = async (input: BlogPostInput, createdById: string) => {
  const slug = input.slug ?? toSlug(input.title) + "-" + Date.now();
  return prisma.blogPost.create({
    data: {
      title: input.title,
      slug,
      category: input.category,
      excerpt: input.excerpt,
      content: input.content,
      coverImageUrl: input.coverImageUrl,
      status: input.status,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      createdById,
    },
  });
};

export const updateBlogPost = async (id: string, input: Partial<BlogPostInput>, updatedById: string) => {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Blog post not found", 404);
  return prisma.blogPost.update({
    where: { id },
    data: { ...input, updatedById, publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined },
  });
};

export const deleteBlogPost = async (id: string) => {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Blog post not found", 404);
  await prisma.blogPost.delete({ where: { id } });
};

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const listReviews = async (filters: { status?: string; skip: number; take: number }) => {
  const where = filters.status ? { status: filters.status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: "desc" },
      include: {
        customerUser: { select: { id: true, displayName: true } },
        event: { select: { id: true, name: true } },
        scores: { include: { criteria: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  return { items, total };
};

export const approveReview = async (id: string, approvedById: string) => {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Review not found", 404);
  return prisma.review.update({
    where: { id },
    data: { status: "approved", approvedAt: new Date(), approvedById },
  });
};

export const hideReview = async (id: string) => {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Review not found", 404);
  return prisma.review.update({ where: { id }, data: { status: "hidden" } });
};
