import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { emitNotification } from "../../lib/socket";
import { createError } from "../../middleware/errorHandler";

type Tx = Prisma.TransactionClient;

type CustomerTrackingOptions = {
  actorUserId?: string | null;
  status: "contracted" | "in_progress" | "completed";
  activityMessage: string;
  notificationTitle: string;
  notificationMessage: string;
};

type NotificationPayload = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
  userId: string;
};

const addDays = (value: Date, days: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const defaultMilestones = (eventDate?: Date | null) => [
  {
    title: "Kickoff du an",
    description: "Thong tin su kien da san sang de khach hang theo doi.",
    milestoneDate: null,
    status: "done",
    sortOrder: 10,
  },
  {
    title: "Chot ke hoach",
    description: "Thong nhat timeline, hang muc cong viec va nguon luc chinh.",
    milestoneDate: eventDate ? addDays(eventDate, -14) : null,
    status: "todo",
    sortOrder: 20,
  },
  {
    title: "Trien khai su kien",
    description: "Ban to chuc tien hanh setup va dieu phoi su kien.",
    milestoneDate: eventDate ?? null,
    status: "todo",
    sortOrder: 30,
  },
  {
    title: "Nghiem thu va hoan tat",
    description: "Tong ket, ban giao tai lieu va hoan tat thanh toan.",
    milestoneDate: eventDate ? addDays(eventDate, 1) : null,
    status: "todo",
    sortOrder: 40,
  },
];

export const ensureCustomerTrackingInTransaction = async (
  tx: Tx,
  eventId: string,
  options: CustomerTrackingOptions,
) => {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      status: true,
      customerUserId: true,
      organizerUserId: true,
      eventDate: true,
    },
  });
  if (!event) throw createError("NOT_FOUND", "Event not found", 404);

  const updatedEvent = await tx.event.update({
    where: { id: eventId },
    data: { status: options.status },
    select: {
      id: true,
      name: true,
      status: true,
      progressPercent: true,
      customerUserId: true,
      organizerUserId: true,
    },
  });

  const milestoneCount = await tx.eventMilestone.count({ where: { eventId } });
  if (milestoneCount === 0) {
    await tx.eventMilestone.createMany({
      data: defaultMilestones(event.eventDate).map((milestone) => ({
        eventId,
        ...milestone,
      })),
    });
  }

  let thread = await tx.chatThread.findFirst({
    where: { eventId },
    select: { id: true },
  });
  thread ??= await tx.chatThread.create({
    data: { eventId },
    select: { id: true },
  });

  await tx.chatThreadMember.upsert({
    where: { threadId_userId: { threadId: thread.id, userId: event.customerUserId } },
    create: { threadId: thread.id, userId: event.customerUserId },
    update: {},
  });

  if (event.organizerUserId) {
    await tx.chatThreadMember.upsert({
      where: { threadId_userId: { threadId: thread.id, userId: event.organizerUserId } },
      create: { threadId: thread.id, userId: event.organizerUserId },
      update: {},
    });
  }

  await tx.eventActivity.create({
    data: {
      eventId,
      actorUserId: options.actorUserId ?? event.organizerUserId,
      iconName: "check",
      message: options.activityMessage,
    },
  });

  const notification = await tx.notification.create({
    data: {
      userId: event.customerUserId,
      scope: "customer",
      type: "project",
      title: options.notificationTitle,
      message: options.notificationMessage,
      entityType: "event",
      entityId: eventId,
    },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  });

  return { event: updatedEvent, notification };
};

export const emitCustomerNotification = (notification: NotificationPayload) => {
  emitNotification(notification.userId, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    entityType: notification.entityType,
    entityId: notification.entityId,
    createdAt: notification.createdAt,
  });
};

export const activateCustomerTracking = async (
  eventId: string,
  options: CustomerTrackingOptions,
) => {
  const result = await prisma.$transaction((tx) =>
    ensureCustomerTrackingInTransaction(tx, eventId, options),
  );
  emitCustomerNotification(result.notification);
  return result.event;
};
