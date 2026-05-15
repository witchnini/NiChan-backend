import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const staffSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().toLowerCase().email(),
  phone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().regex(/^0[3-9]\d{8}$/).optional(),
  ),
  jobTitle: z.string().trim().min(1).max(255),
  address: optionalText(500),
  employmentStatus: z.enum(["active", "inactive"]).default("active"),
});

export const shiftSchema = z.object({
  workDate: z.string().datetime({ offset: true }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  eventId: z.string().uuid().optional().nullable(),
  note: z.string().max(500).optional(),
});

export type StaffInput = z.infer<typeof staffSchema>;
export type ShiftInput = z.infer<typeof shiftSchema>;

const userStatusFromEmployment = (employmentStatus?: string) =>
  employmentStatus === "inactive" ? "inactive" : "active";

const createStaffPasswordHash = () => bcrypt.hash(`staff-${randomUUID()}`, 12);

export const listStaff = async (filters: {
  status?: string;
  search?: string;
  skip: number;
  take: number;
}) => {
  const where = {
    role: "staff",
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? { OR: [{ displayName: { contains: filters.search } }, { email: { contains: filters.search } }] }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { displayName: "asc" },
      include: { staffProfile: true, shifts: { orderBy: { workDate: "desc" }, take: 3 } },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
};

export const getStaffById = async (id: string) => {
  const staff = await prisma.user.findFirst({
    where: { id, role: "staff", deletedAt: null },
    include: { staffProfile: true, shifts: { orderBy: { workDate: "desc" }, take: 10 } },
  });
  if (!staff) throw createError("NOT_FOUND", "Staff member not found", 404);
  return staff;
};

export const createStaff = async (input: StaffInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing && !existing.deletedAt) throw createError("CONFLICT", "Email already registered", 409);
  if (existing && existing.role !== "staff") {
    throw createError("CONFLICT", "Email belongs to another account type", 409);
  }

  const passwordHash = await createStaffPasswordHash();
  const userStatus = userStatusFromEmployment(input.employmentStatus);

  return existing
    ? prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          displayName: input.name,
          phone: input.phone,
          role: "staff",
          status: userStatus,
          deletedAt: null,
          staffProfile: {
            upsert: {
              create: {
                fullName: input.name,
                jobTitle: input.jobTitle,
                address: input.address,
                employmentStatus: input.employmentStatus ?? "active",
              },
              update: {
                fullName: input.name,
                jobTitle: input.jobTitle,
                address: input.address,
                employmentStatus: input.employmentStatus ?? "active",
              },
            },
          },
        },
        include: { staffProfile: true },
      })
    : prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          displayName: input.name,
          phone: input.phone,
          role: "staff",
          status: userStatus,
          staffProfile: {
            create: {
              fullName: input.name,
              jobTitle: input.jobTitle,
              address: input.address,
              employmentStatus: input.employmentStatus ?? "active",
            },
          },
        },
        include: { staffProfile: true },
      });
};

export const updateStaff = async (id: string, input: Partial<StaffInput>) => {
  const existing = await prisma.user.findFirst({ where: { id, role: "staff", deletedAt: null } });
  if (!existing) throw createError("NOT_FOUND", "Staff member not found", 404);

  await prisma.user.update({
    where: { id },
    data: {
      ...(input.name ? { displayName: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.employmentStatus !== undefined
        ? { status: userStatusFromEmployment(input.employmentStatus) }
        : {}),
    },
    include: { staffProfile: true },
  });

  if (input.name || input.jobTitle || input.address || input.employmentStatus) {
    await prisma.staffProfile.upsert({
      where: { userId: id },
      create: {
        userId: id,
        fullName: input.name ?? existing.displayName,
        jobTitle: input.jobTitle ?? "Staff",
        address: input.address,
        employmentStatus: input.employmentStatus ?? "active",
      },
      update: {
        ...(input.name ? { fullName: input.name } : {}),
        ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.employmentStatus ? { employmentStatus: input.employmentStatus } : {}),
      },
    });
  }

  return getStaffById(id);
};

export const deleteStaff = async (id: string) => {
  const existing = await prisma.user.findFirst({
    where: { id, role: "staff", deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw createError("NOT_FOUND", "Staff member not found", 404);

  await prisma.$transaction(async (tx) => {
    await tx.projectTask.updateMany({
      where: { assigneeUserId: id },
      data: { assigneeUserId: null },
    });
    await tx.shiftSchedule.deleteMany({ where: { staffUserId: id } });
    await tx.eventStaffAssignment.deleteMany({ where: { staffUserId: id } });
    await tx.staffProfile.deleteMany({ where: { userId: id } });
    await tx.user.update({
      where: { id },
      data: {
        status: "inactive",
        deletedAt: new Date(),
      },
    });
  });

  return { deleted: true };
};

export const getStaffShifts = async (staffId: string) =>
  prisma.shiftSchedule.findMany({
    where: { staffUserId: staffId },
    orderBy: { workDate: "desc" },
    include: { event: { select: { id: true, name: true } } },
  });

export const createShift = async (staffId: string, input: ShiftInput) => {
  return prisma.shiftSchedule.create({
    data: {
      staffUserId: staffId,
      workDate: new Date(input.workDate),
      startTime: input.startTime,
      endTime: input.endTime,
      eventId: input.eventId,
      note: input.note,
    },
  });
};

export const getSchedule = async (startDate?: string, endDate?: string) => {
  return prisma.shiftSchedule.findMany({
    where: {
      ...(startDate ? { workDate: { gte: new Date(startDate) } } : {}),
      ...(endDate ? { workDate: { lte: new Date(endDate) } } : {}),
    },
    orderBy: [{ workDate: "asc" }, { startTime: "asc" }],
    include: {
      staffUser: { select: { id: true, displayName: true, avatarUrl: true } },
      event: { select: { id: true, name: true } },
    },
  });
};
