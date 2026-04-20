import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import { z } from "zod";

// ─── Schema ────────────────────────────────────────────────────────────────────

export const staffAssignSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  staffUserId: z.string().uuid("Invalid staff user ID"),
  roleText: z.string().min(1).max(255),
});

export const staffAssignUpdateSchema = z.object({
  status: z.enum(["invited", "confirmed", "declined"]),
});

export type StaffAssignInput = z.infer<typeof staffAssignSchema>;

// ─── List staff (global staff list for organizer to pick from) ────────────────

export const listAvailableStaff = async (filters: {
  search?: string;
  skip: number;
  take: number;
}) => {
  const where = {
    role: "staff",
    status: "active",
    deletedAt: null,
    ...(filters.search
      ? {
          OR: [
            { displayName: { contains: filters.search } },
            { email: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        staffProfile: { select: { fullName: true, jobTitle: true, employmentStatus: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
};

// ─── Event staff assignments (for a specific event) ───────────────────────────

export const getEventStaff = async (eventId: string, organizerUserId: string) => {
  // Verify event belongs to this organizer
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerUserId },
    select: { id: true, name: true },
  });
  if (!event) throw createError("NOT_FOUND", "Event not found or access denied", 404);

  const assignments = await prisma.eventStaffAssignment.findMany({
    where: { eventId },
    include: {
      staffUser: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          staffProfile: { select: { jobTitle: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  return { event, assignments };
};

export const assignStaffToEvent = async (input: StaffAssignInput, assignedById: string) => {
  // Verify staff exists and is active
  const staff = await prisma.user.findFirst({
    where: { id: input.staffUserId, role: "staff", status: "active", deletedAt: null },
    select: { id: true, displayName: true },
  });
  if (!staff) throw createError("NOT_FOUND", "Staff member not found or inactive", 404);

  // Check for duplicate assignment
  const existing = await prisma.eventStaffAssignment.findFirst({
    where: { eventId: input.eventId, staffUserId: input.staffUserId },
  });
  if (existing) throw createError("CONFLICT", "Staff already assigned to this event", 409);

  return prisma.eventStaffAssignment.create({
    data: {
      eventId: input.eventId,
      staffUserId: input.staffUserId,
      roleText: input.roleText,
      status: "invited",
    },
    include: {
      staffUser: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
    },
  });
};

export const updateStaffAssignment = async (assignmentId: string, status: string) => {
  const existing = await prisma.eventStaffAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing) throw createError("NOT_FOUND", "Assignment not found", 404);

  return prisma.eventStaffAssignment.update({
    where: { id: assignmentId },
    data: { status },
    include: {
      staffUser: { select: { id: true, displayName: true } },
    },
  });
};

export const removeStaffFromEvent = async (assignmentId: string, organizerUserId: string) => {
  const existing = await prisma.eventStaffAssignment.findUnique({
    where: { id: assignmentId },
    include: { event: { select: { organizerUserId: true } } },
  });
  if (!existing) throw createError("NOT_FOUND", "Assignment not found", 404);
  if (existing.event.organizerUserId !== organizerUserId) {
    throw createError("FORBIDDEN", "You do not manage this event", 403);
  }

  await prisma.eventStaffAssignment.delete({ where: { id: assignmentId } });
};

// ─── Staff shift schedules (read-only for organizer) ─────────────────────────

export const getStaffShiftsForOrganizer = async (organizerUserId: string) => {
  return prisma.shiftSchedule.findMany({
    where: { event: { organizerUserId } },
    orderBy: [{ workDate: "asc" }, { startTime: "asc" }],
    include: {
      staffUser: { select: { id: true, displayName: true, avatarUrl: true } },
      event: { select: { id: true, name: true } },
    },
  });
};
