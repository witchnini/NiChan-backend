import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const vendorSchema = z.object({
  name: z.string().min(1).max(255),
  categoryId: z.string().uuid("Invalid category ID"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  bankAccountNumber: z.string().max(100).optional(),
  contactName: z.string().max(255).optional(),
  address: z.string().min(1).max(500),
  note: z.string().max(1000).optional(),
  status: z.enum(["active", "paused", "inactive"]).default("active"),
});

export const vendorCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
});

export type VendorInput = z.infer<typeof vendorSchema>;
export type VendorCategoryInput = z.infer<typeof vendorCategorySchema>;

// ─── Vendor Categories ────────────────────────────────────────────────────────

export const listVendorCategories = async () =>
  prisma.vendorCategory.findMany({ orderBy: { name: "asc" } });

export const createVendorCategory = async (input: VendorCategoryInput) => {
  const existing = await prisma.vendorCategory.findFirst({
    where: { OR: [{ name: input.name }, { slug: input.slug }] },
  });
  if (existing) throw createError("CONFLICT", "Category name or slug already exists", 409);

  return prisma.vendorCategory.create({ data: input });
};

export const updateVendorCategory = async (id: string, input: Partial<VendorCategoryInput>) => {
  const existing = await prisma.vendorCategory.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Vendor category not found", 404);
  return prisma.vendorCategory.update({ where: { id }, data: input });
};

// ─── Vendors ─────────────────────────────────────────────────────────────────

export const listVendors = async (filters: {
  categoryId?: string;
  status?: string;
  search?: string;
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
}) => {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search } },
            { email: { contains: filters.search } },
            { contactName: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { eventVendors: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return { items, total };
};

export const getVendorById = async (id: string) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { eventVendors: true } },
      budgetItems: { select: { id: true, category: true, estimatedAmount: true, actualAmount: true } },
      eventVendors: { select: { id: true, eventId: true, status: true, serviceNote: true } },
    },
  });
  if (!vendor) throw createError("NOT_FOUND", "Vendor not found", 404);
  return vendor;
};

export const createVendor = async (input: VendorInput) => {
  const category = await prisma.vendorCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw createError("NOT_FOUND", "Vendor category not found", 404);

  return prisma.vendor.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      phone: input.phone,
      email: input.email || null,
      bankAccountNumber: input.bankAccountNumber,
      contactName: input.contactName,
      address: input.address,
      note: input.note,
      status: input.status,
    },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { eventVendors: true } },
    },
  });
};

export const updateVendor = async (id: string, input: Partial<VendorInput>) => {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Vendor not found", 404);

  return prisma.vendor.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.bankAccountNumber !== undefined ? { bankAccountNumber: input.bankAccountNumber || null } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { eventVendors: true } },
    },
  });
};

export const updateVendorStatus = async (id: string, status: string) => {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Vendor not found", 404);
  return prisma.vendor.update({
    where: { id },
    data: { status },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { eventVendors: true } },
    },
  });
};

export const deleteVendor = async (id: string) => {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Vendor not found", 404);

  // Cannot delete if linked to active event vendors
  const activeLinks = await prisma.eventVendor.count({ where: { vendorId: id } });
  if (activeLinks > 0) {
    // Soft-deactivate instead of hard delete
    return prisma.vendor.update({ where: { id }, data: { status: "inactive" } });
  }

  await prisma.vendor.delete({ where: { id } });
  return { deleted: true };
};
