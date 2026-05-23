import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { emitNotification } from "../../../lib/socket";
import { createError } from "../../../middleware/errorHandler";
import { z } from "zod";

// ─── Schema ────────────────────────────────────────────────────────────────────

export const staffAssignSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  staffUserId: z.string().uuid("Invalid staff user ID"),
  roleText: z.string().min(1).max(255),
});

export const staffAssignBodySchema = staffAssignSchema.omit({ eventId: true });

export const staffAssignUpdateSchema = z
  .object({
    roleText: z.string().trim().min(1).max(255).optional(),
    status: z.enum(["invited", "confirmed", "declined"]).optional(),
  })
  .refine((value) => value.roleText !== undefined || value.status !== undefined, {
    message: "No assignment fields provided",
  });

export type StaffAssignInput = z.infer<typeof staffAssignSchema>;
export type StaffAssignUpdateInput = z.infer<typeof staffAssignUpdateSchema>;

const notifyAdminsOfProjectStaffChange = async (
  tx: Prisma.TransactionClient,
  eventId: string,
  message: string,
) => {
  const admins = await tx.user.findMany({
    where: { role: "admin", status: "active", deletedAt: null },
    select: { id: true },
  });

  return Promise.all(
    admins.map((admin) =>
      tx.notification.create({
        data: {
          userId: admin.id,
          scope: "admin",
          type: "project_staff",
          title: "Nhan su du an duoc cap nhat",
          message,
          entityType: "event",
          entityId: eventId,
        },
      }),
    ),
  );
};

const emitProjectStaffNotifications = (
  notifications: {
    id: string;
    userId: string;
    type: string;
    title: string | null;
    message: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: Date;
  }[],
) => {
  notifications.forEach((notification) => {
    emitNotification(notification.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title ?? null,
      message: notification.message,
      entityType: notification.entityType ?? null,
      entityId: notification.entityId ?? null,
      createdAt: notification.createdAt,
    });
  });
};

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

export const getEventStaff = async (eventId: string, actorUserId: string, actorRole: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ...(actorRole === "organizer" ? { organizerUserId: actorUserId } : {}),
    },
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

export const assignStaffToEvent = async (
  input: StaffAssignInput,
  actorUserId: string,
  actorRole: string,
) => {
  const event = await prisma.event.findFirst({
    where: {
      id: input.eventId,
      ...(actorRole === "organizer" ? { organizerUserId: actorUserId } : {}),
    },
    select: {
      id: true,
      name: true,
      organizerUser: { select: { id: true, displayName: true } },
    },
  });
  if (!event) throw createError("NOT_FOUND", "Event not found or access denied", 404);

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

  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.eventStaffAssignment.create({
      data: {
        eventId: input.eventId,
        staffUserId: input.staffUserId,
        roleText: input.roleText,
        status: "invited",
      },
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
    });

    await tx.eventActivity.create({
      data: {
        eventId: input.eventId,
        actorUserId,
        iconName: "users",
        message: `${event.organizerUser?.displayName ?? "Organizer"} đã thêm ${staff.displayName} vào nhân sự dự án với vai trò ${input.roleText}.`,
      },
    });

    const notifications = await notifyAdminsOfProjectStaffChange(
      tx,
      input.eventId,
      `${event.organizerUser?.displayName ?? "Organizer"} đã thêm ${staff.displayName} vào dự án ${event.name} với vai trò ${input.roleText}.`,
    );

    return { assignment, notifications };
  });

  emitProjectStaffNotifications(result.notifications);

  return result.assignment;
};

export const updateStaffAssignment = async (
  assignmentId: string,
  input: StaffAssignUpdateInput,
  actorUserId: string,
  actorRole: string,
) => {
  const existing = await prisma.eventStaffAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          organizerUserId: true,
          organizerUser: { select: { displayName: true } },
        },
      },
      staffUser: { select: { displayName: true } },
    },
  });
  if (!existing) throw createError("NOT_FOUND", "Assignment not found", 404);
  if (actorRole === "organizer" && existing.event.organizerUserId !== actorUserId) {
    throw createError("FORBIDDEN", "You do not manage this event", 403);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.eventStaffAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(input.roleText !== undefined ? { roleText: input.roleText } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
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
    });

    const nextRole = input.roleText ?? existing.roleText;
    const nextStatus = input.status ?? existing.status;
    const message = `${existing.event.organizerUser?.displayName ?? "Organizer"} đã cập nhật ${existing.staffUser.displayName} trong dự án ${existing.event.name}: vai trò ${nextRole}, trạng thái ${nextStatus}.`;

    await tx.eventActivity.create({
      data: {
        eventId: existing.event.id,
        actorUserId,
        iconName: "users",
        message,
      },
    });

    const notifications = await notifyAdminsOfProjectStaffChange(tx, existing.event.id, message);

    return { updated, notifications };
  });

  emitProjectStaffNotifications(result.notifications);
  return result.updated;
};

export const removeStaffFromEvent = async (
  assignmentId: string,
  actorUserId: string,
  actorRole: string,
) => {
  const existing = await prisma.eventStaffAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          organizerUserId: true,
          organizerUser: { select: { displayName: true } },
        },
      },
      staffUser: { select: { displayName: true } },
    },
  });
  if (!existing) throw createError("NOT_FOUND", "Assignment not found", 404);
  if (actorRole === "organizer" && existing.event.organizerUserId !== actorUserId) {
    throw createError("FORBIDDEN", "You do not manage this event", 403);
  }

  const notifications = await prisma.$transaction(async (tx) => {
    await tx.eventStaffAssignment.delete({ where: { id: assignmentId } });

    const message = `${existing.event.organizerUser?.displayName ?? "Organizer"} đã gỡ ${existing.staffUser.displayName} khỏi nhân sự dự án ${existing.event.name}.`;

    await tx.eventActivity.create({
      data: {
        eventId: existing.event.id,
        actorUserId,
        iconName: "users",
        message,
      },
    });

    return notifyAdminsOfProjectStaffChange(tx, existing.event.id, message);
  });

  emitProjectStaffNotifications(notifications);
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
