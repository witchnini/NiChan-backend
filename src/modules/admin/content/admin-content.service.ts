import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const portfolioSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(100),
  content: z.string().optional().nullable(),
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
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  status: z.enum(["draft", "scheduled", "published", "hidden"]).default("draft"),
  publishedAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const serviceCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

export const serviceSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  categorySlug: z.string().min(1).max(100).optional().nullable(),
  shortDescription: z.string().min(1).max(500),
  description: z.string().min(1),
  priceFrom: z.number().nonnegative().optional().nullable(),
  priceTo: z.number().nonnegative().optional().nullable(),
  guestFrom: z.number().int().positive().optional().nullable(),
  guestTo: z.number().int().positive().optional().nullable(),
  locationText: z.string().max(255).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type PortfolioInput = z.infer<typeof portfolioSchema>;
export type BlogPostInput = z.infer<typeof blogPostSchema>;
export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;

// ─── Portfolio ────────────────────────────────────────────────────────────────

const toSlug = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 255);

// ─── Service Categories ──────────────────────────────────────────────────────

export const listServiceCategories = async () =>
  prisma.serviceCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

export const createServiceCategory = async (input: ServiceCategoryInput) => {
  const slug = input.slug ? toSlug(input.slug) : toSlug(input.name);
  const existing = await prisma.serviceCategory.findUnique({ where: { slug } });
  if (existing) throw createError("CONFLICT", "Service category slug already exists", 409);

  return prisma.serviceCategory.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive,
    },
  });
};

export const deleteServiceCategory = async (id: string) => {
  const existing = await prisma.serviceCategory.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Service category not found", 404);

  const serviceCount = await prisma.service.count({ where: { categoryId: id } });
  if (serviceCount > 0) {
    return prisma.serviceCategory.update({ where: { id }, data: { isActive: false } });
  }

  await prisma.serviceCategory.delete({ where: { id } });
  return { deleted: true };
};

// ─── Services ────────────────────────────────────────────────────────────────

const resolveServiceCategoryId = async (input: Pick<ServiceInput, "categoryId" | "categorySlug">) => {
  if (input.categoryId) {
    const category = await prisma.serviceCategory.findUnique({ where: { id: input.categoryId } });
    if (!category) throw createError("NOT_FOUND", "Service category not found", 404);
    return category.id;
  }

  if (input.categorySlug) {
    const category = await prisma.serviceCategory.findUnique({ where: { slug: input.categorySlug } });
    if (!category) throw createError("NOT_FOUND", "Service category not found", 404);
    return category.id;
  }

  throw createError("VALIDATION_ERROR", "Service category is required", 400);
};

export const listServices = async (filters: {
  categorySlug?: string;
  active?: string;
  search?: string;
  skip: number;
  take: number;
}) => {
  const where = {
    ...(filters.active === "true" ? { isActive: true } : {}),
    ...(filters.active === "false" ? { isActive: false } : {}),
    ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search } },
            { shortDescription: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.service.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ isFeatured: "desc" }, { title: "asc" }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.service.count({ where }),
  ]);

  return { items, total };
};

export const createService = async (input: ServiceInput) => {
  const categoryId = await resolveServiceCategoryId(input);
  const slug = input.slug ? toSlug(input.slug) : `${toSlug(input.title)}-${Date.now()}`;

  return prisma.service.create({
    data: {
      categoryId,
      title: input.title,
      slug,
      shortDescription: input.shortDescription,
      description: input.description,
      priceFrom: input.priceFrom,
      priceTo: input.priceTo,
      guestFrom: input.guestFrom,
      guestTo: input.guestTo,
      locationText: input.locationText,
      coverImageUrl: input.coverImageUrl,
      isFeatured: input.isFeatured,
      isActive: input.isActive,
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
};

export const updateService = async (id: string, input: Partial<ServiceInput>) => {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Service not found", 404);

  const categoryId =
    input.categoryId !== undefined || input.categorySlug !== undefined
      ? await resolveServiceCategoryId(input)
      : undefined;

  return prisma.service.update({
    where: { id },
    data: {
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.slug !== undefined ? { slug: toSlug(input.slug) } : {}),
      ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priceFrom !== undefined ? { priceFrom: input.priceFrom } : {}),
      ...(input.priceTo !== undefined ? { priceTo: input.priceTo } : {}),
      ...(input.guestFrom !== undefined ? { guestFrom: input.guestFrom } : {}),
      ...(input.guestTo !== undefined ? { guestTo: input.guestTo } : {}),
      ...(input.locationText !== undefined ? { locationText: input.locationText } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
};

export const deleteService = async (id: string) => {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Service not found", 404);
  await prisma.service.delete({ where: { id } });
};

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
      content: input.content,
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
    data: {
      ...input,
      updatedById,
      publishedAt:
        input.publishedAt === null
          ? null
          : input.publishedAt
            ? new Date(input.publishedAt)
            : undefined,
    },
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
