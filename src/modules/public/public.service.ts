import { prisma } from "../../lib/prisma";
import { createError } from "../../middleware/errorHandler";

// ─── Service Categories ───────────────────────────────────────────────────────

export const getServiceCategories = async () => {
  return prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
};

// ─── Services ─────────────────────────────────────────────────────────────────

export const getServices = async (filters: {
  category?: string;
  search?: string;
  featured?: string;
}) => {
  return prisma.service.findMany({
    where: {
      isActive: true,
      ...(filters.featured === "true" ? { isFeatured: true } : {}),
      ...(filters.category
        ? { category: { slug: filters.category } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search } },
              { shortDescription: { contains: filters.search } },
            ],
          }
        : {}),
    },
    include: { category: { select: { name: true, slug: true } } },
    orderBy: [{ isFeatured: "desc" }],
  });
};

export const getServiceBySlug = async (slug: string) => {
  const service = await prisma.service.findUnique({
    where: { slug },
    include: { category: { select: { name: true, slug: true } } },
  });

  if (!service) {
    throw createError("NOT_FOUND", "Service not found", 404);
  }

  // Increment view count (fire-and-forget)
  prisma.service.update({ where: { slug }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return service;
};

// ─── Portfolio ────────────────────────────────────────────────────────────────

export const getPortfolio = async (filters: {
  category?: string;
  visibleOnly?: string;
}) => {
  return prisma.portfolioItem.findMany({
    where: {
      ...(filters.visibleOnly !== "false" ? { status: "visible" } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    },
    orderBy: { publishedAt: "desc" },
  });
};

export const getPortfolioBySlug = async (slug: string) => {
  const item = await prisma.portfolioItem.findUnique({
    where: { slug },
  });

  if (!item) {
    throw createError("NOT_FOUND", "Portfolio item not found", 404);
  }

  // Increment view count (fire-and-forget)
  prisma.portfolioItem.update({ where: { slug }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return item;
};

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export const getBlogPosts = async (
  filters: { category?: string; search?: string; status?: string },
  skip: number,
  take: number,
) => {
  const where = {
    status: (filters.status ?? "published") as never,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search } },
            { excerpt: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.blogPost.findMany({
      where,
      skip,
      take,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        excerpt: true,
        coverImageUrl: true,
        status: true,
        viewCount: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return { items, total };
};

export const getBlogPostById = async (id: string) => {
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      createdBy: { select: { displayName: true, avatarUrl: true } },
    },
  });

  if (!post) throw createError("NOT_FOUND", "Blog post not found", 404);

  // Increment view count (fire-and-forget)
  prisma.blogPost.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return post;
};

// ─── Testimonials ─────────────────────────────────────────────────────────────

export const getTestimonials = async () => {
  return prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { id: "asc" }],
  });
};

// ─── Review Criteria ──────────────────────────────────────────────────────────

export const getReviewCriteria = async () => {
  return prisma.reviewCriteria.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, key: true, label: true, sortOrder: true },
  });
};
