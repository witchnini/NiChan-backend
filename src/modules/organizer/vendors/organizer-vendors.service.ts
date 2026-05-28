import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const vendorSchema = z.object({
  name: z.string().min(1).max(255),
  categoryId: z.string().uuid(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  bankAccountNumber: z.string().max(100).optional(),
  contactName: z.string().optional(),
  address: z.string().min(1).max(500),
  note: z.string().max(1000).optional(),
});

export const vendorStatusSchema = z.object({
  status: z.enum(["active", "paused", "inactive"]),
});

export type VendorInput = z.infer<typeof vendorSchema>;

// ─── Vendor Categories ────────────────────────────────────────────────────────

export const listVendorCategories = async () =>
  prisma.vendorCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

// ─── Vendors ─────────────────────────────────────────────────────────────────

export const listVendors = async (filters: {
  categoryId?: string;
  status?: string;
  search?: string;
  skip: number;
  take: number;
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
    },
  });
  if (!vendor) throw createError("NOT_FOUND", "Vendor not found", 404);
  return vendor;
};

export const createVendor = async (input: VendorInput) => {
  return prisma.vendor.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      phone: input.phone,
      email: input.email,
      bankAccountNumber: input.bankAccountNumber,
      contactName: input.contactName,
      address: input.address,
      note: input.note,
      status: "active",
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
    data: input,
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

  const linkedProjects = await prisma.eventVendor.count({ where: { vendorId: id } });
  if (linkedProjects > 0) {
    return prisma.vendor.update({
      where: { id },
      data: { status: "inactive" },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { eventVendors: true } },
      },
    });
  }

  await prisma.vendor.delete({ where: { id } });
  return { deleted: true };
};

// ─── Event Vendors ────────────────────────────────────────────────────────────

export const getEventVendors = async (eventId: string) =>
  prisma.eventVendor.findMany({
    where: { eventId },
    include: { vendor: { include: { category: { select: { name: true } } } } },
  });

export const addEventVendor = async (eventId: string, vendorId: string, serviceNote?: string) => {
  return prisma.eventVendor.create({
    data: { eventId, vendorId, serviceNote, status: "active" },
    include: { vendor: true },
  });
};

export const removeEventVendor = async (eventVendorId: string) => {
  const existing = await prisma.eventVendor.findUnique({ where: { id: eventVendorId } });
  if (!existing) throw createError("NOT_FOUND", "Event vendor not found", 404);
  await prisma.eventVendor.delete({ where: { id: eventVendorId } });
};
