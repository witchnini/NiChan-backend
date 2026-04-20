import { prisma } from "../../../lib/prisma";
import { emitNotification } from "../../../lib/socket";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getOrganizerDashboard = async (organizerUserId: string) => {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [projectProgress, tasksByStatus, upcomingTasks, notifications] =
    await prisma.$transaction([
      // project progress
      prisma.event.findMany({
        where: { organizerUserId, status: { not: "cancelled" } },
        select: {
          id: true,
          name: true,
          status: true,
          progressPercent: true,
          eventDate: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { eventDate: "asc" },
        take: 10,
      }),
      // tasks grouped by status — raw aggregate
      prisma.projectTask.groupBy({
        by: ["status"],
        where: { event: { organizerUserId } },
        _count: { status: true },
        orderBy: { _count: { status: "desc" } },
      }),
      // upcoming tasks this week
      prisma.projectTask.findMany({
        where: {
          event: { organizerUserId },
          dueAt: { gte: now, lte: weekEnd },
          status: { not: "done" },
        },
        orderBy: { dueAt: "asc" },
        take: 10,
        include: { event: { select: { id: true, name: true } } },
      }),
      // unread notifications
      prisma.notification.findMany({
        where: { userId: organizerUserId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return { projectProgress, tasksByStatus, upcomingTasks, notifications };
};

export const getOrganizerNotifications = async (
  userId: string,
  filters: { read?: string; type?: string; skip: number; take: number },
) => {
  const where = {
    userId,
    ...(filters.read !== undefined ? { isRead: filters.read === "true" } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, total };
};

export const markNotificationRead = async (id: string, userId: string) => {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
};

// ─── Send notification helper (reusable) ─────────────────────────────────────

export const createNotification = async (data: {
  userId: string;
  scope: string;
  type: string;
  title?: string;
  message: string;
  entityType?: string;
  entityId?: string;
}) => {
  const notification = await prisma.notification.create({ data: { ...data, isRead: false } });
  emitNotification(data.userId, {
    id: notification.id,
    type: notification.type,
    title: notification.title ?? null,
    message: notification.message,
    entityType: notification.entityType ?? null,
    entityId: notification.entityId ?? null,
    createdAt: notification.createdAt,
  });
  return notification;
};
