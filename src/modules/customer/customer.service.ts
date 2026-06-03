import { prisma } from "../../lib/prisma";
import { createError } from "../../middleware/errorHandler";
import { emitNewMessage, emitMessageDeleted } from "../../lib/socket";
import { z } from "zod";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getCustomerDashboard = async (customerUserId: string) => {
  const [events, contracts, transactions] = await prisma.$transaction([
    prisma.event.findMany({
      where: { customerUserId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        eventDate: true,
        progressPercent: true,
        organizerUser: { select: { id: true, displayName: true, avatarUrl: true } },
        customerUser: { select: { id: true, displayName: true } },
        consultationRequest: {
          select: {
            id: true,
            customerName: true,
            eventType: true,
            note: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.contract.findMany({
      where: { customerUserId },
      select: { id: true, contractCode: true, status: true, totalValue: true, sentAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { event: { customerUserId } },
      select: { id: true, description: true, amount: true, transactionDate: true, status: true },
      orderBy: { transactionDate: "desc" },
      take: 5,
    }),
  ]);

  const recentActivities = await prisma.eventActivity.findMany({
    where: { event: { customerUserId } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, message: true, iconName: true, createdAt: true },
  });

  return { events, recentActivities, contracts, transactions };
};

// ─── Events ───────────────────────────────────────────────────────────────────

export const getCustomerEvents = async (
  customerUserId: string,
  filters: { status?: string; upcomingOnly?: string },
) => {
  const now = new Date();
  return prisma.event.findMany({
    where: {
      customerUserId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.upcomingOnly === "true"
        ? { eventDate: { gte: now }, status: { not: "cancelled" } }
        : {}),
    },
    include: {
      organizerUser: { select: { id: true, displayName: true, avatarUrl: true } },
      customerUser: { select: { id: true, displayName: true } },
      consultationRequest: {
        select: {
          id: true,
          customerName: true,
          eventType: true,
          note: true,
        },
      },
      _count: { select: { tasks: true, milestones: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getCustomerEventById = async (eventId: string, customerUserId: string) => {
  const event = await prisma.event.findFirst({
    where: { id: eventId },
    include: {
      organizerUser: { select: { id: true, displayName: true, avatarUrl: true, phone: true } },
      customerUser: { select: { id: true, displayName: true } },
      consultationRequest: {
        select: {
          id: true,
          customerName: true,
          eventType: true,
          note: true,
        },
      },
      milestones: { orderBy: { sortOrder: "asc" } },
      _count: { select: { tasks: true } },
    },
  });
  if (!event) throw createError("NOT_FOUND", "Event not found", 404);
  if (event.customerUserId !== customerUserId)
    throw createError("FORBIDDEN", "You do not have access to this event", 403);
  return event;
};

export const getEventMilestones = async (eventId: string, customerUserId: string) => {
  const event = await prisma.event.findFirst({
    where: { id: eventId, customerUserId },
    select: { id: true },
  });
  if (!event) throw createError("NOT_FOUND", "Event not found or access denied", 404);

  return prisma.eventMilestone.findMany({
    where: { eventId },
    orderBy: { sortOrder: "asc" },
  });
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

const ensureEventAccess = async (eventId: string, userId: string) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      OR: [{ customerUserId: userId }, { organizerUserId: userId }],
    },
    select: { id: true },
  });
  if (!event) throw createError("FORBIDDEN", "Access denied to this event", 403);
  return event;
};

const ensureThread = async (eventId: string) => {
  let thread = await prisma.chatThread.findFirst({ where: { eventId } });
  if (!thread) {
    thread = await prisma.chatThread.create({ data: { eventId } });
  }
  return thread;
};

export const getChatMessages = async (
  eventId: string,
  userId: string,
  cursor?: string,
  limit = 30,
) => {
  await ensureEventAccess(eventId, userId);
  const thread = await ensureThread(eventId);

  const messages = await prisma.chatMessage.findMany({
    where: {
      threadId: thread.id,
      deletedAt: null,
      ...(cursor ? { sentAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { sentAt: "desc" },
    take: limit,
    include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
  });

  return messages.reverse();
};

const sendMessageBodySchema = z
  .object({
    message: z.string().max(2000).optional().default(""),
    attachmentUrl: z.string().url().max(1000).optional(),
    attachmentType: z.string().max(200).optional(),
    attachmentName: z.string().max(500).optional(),
  })
  .refine((data) => data.message.trim().length > 0 || Boolean(data.attachmentUrl), {
    message: "Message text or an attachment is required",
  });

export const sendChatMessage = async (eventId: string, userId: string, body: unknown) => {
  await ensureEventAccess(eventId, userId);

  const { message, attachmentUrl, attachmentType, attachmentName } =
    sendMessageBodySchema.parse(body);
  const thread = await ensureThread(eventId);

  await prisma.chatThreadMember.upsert({
    where: { threadId_userId: { threadId: thread.id, userId } },
    create: { threadId: thread.id, userId },
    update: {},
  });

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, avatarUrl: true },
  });

  const chatMessage = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      senderUserId: userId,
      messageText: message,
      attachmentUrl: attachmentUrl ?? null,
      attachmentType: attachmentType ?? null,
      attachmentName: attachmentName ?? null,
    },
    include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
  });

  emitNewMessage(eventId, {
    id: chatMessage.id,
    eventId,
    senderUserId: userId,
    sender: { displayName: sender?.displayName ?? "" },
    messageText: message,
    attachmentUrl: attachmentUrl ?? null,
    attachmentType: attachmentType ?? null,
    attachmentName: attachmentName ?? null,
    sentAt: chatMessage.sentAt,
  });

  return chatMessage;
};

export const deleteChatMessage = async (eventId: string, messageId: string, userId: string) => {
  await ensureEventAccess(eventId, userId);

  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, deletedAt: null },
    include: { thread: { select: { eventId: true } } },
  });

  if (!message) throw createError("NOT_FOUND", "Message not found", 404);
  if (message.senderUserId !== userId) throw createError("FORBIDDEN", "You can only delete your own messages", 403);
  if (message.thread.eventId !== eventId) throw createError("FORBIDDEN", "Message does not belong to this event", 403);

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  emitMessageDeleted(eventId, messageId);

  return { success: true };
};

// ─── Reviews ─────────────────────────────────────────────────────────────────

const reviewBodySchema = z.object({
  eventId: z.string().uuid(),
  ratingOverall: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
  criteriaScores: z
    .array(z.object({ key: z.string(), score: z.number().int().min(1).max(5) }))
    .optional(),
});

export const submitReview = async (customerUserId: string, body: unknown) => {
  const input = reviewBodySchema.parse(body);

  const event = await prisma.event.findFirst({
    where: { id: input.eventId, customerUserId, status: "completed" },
  });
  if (!event) throw createError("NOT_FOUND", "Completed event not found", 404);

  const existing = await prisma.review.findUnique({
    where: { eventId_customerUserId: { eventId: input.eventId, customerUserId } },
  });
  if (existing) throw createError("CONFLICT", "Review already submitted for this event", 409);

  const criteriaKeys = input.criteriaScores?.map((s) => s.key) ?? [];
  const criteriaRecords =
    criteriaKeys.length > 0
      ? await prisma.reviewCriteria.findMany({ where: { key: { in: criteriaKeys } } })
      : [];

  return prisma.review.create({
    data: {
      eventId: input.eventId,
      customerUserId,
      ratingOverall: input.ratingOverall,
      comment: input.comment,
      status: "pending",
      submittedAt: new Date(),
      scores: {
        create: criteriaRecords.map((c) => ({
          reviewCriteriaId: c.id,
          score: input.criteriaScores?.find((s) => s.key === c.key)?.score ?? 0,
        })),
      },
    },
    include: { scores: { include: { criteria: true } } },
  });
};

// ─── Contracts & Transactions ─────────────────────────────────────────────────

export const getCustomerContracts = async (customerUserId: string) => {
  return prisma.contract.findMany({
    where: { customerUserId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          type: true,
          customerUser: { select: { id: true, displayName: true } },
          consultationRequest: {
            select: {
              id: true,
              customerName: true,
              eventType: true,
              note: true,
            },
          },
        },
      },
      versions: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getCustomerTransactions = async (customerUserId: string) => {
  return prisma.transaction.findMany({
    where: { event: { customerUserId } },
    include: { event: { select: { id: true, name: true } } },
    orderBy: { transactionDate: "desc" },
  });
};

// ─── Reviews (customer view) ───────────────────────────────────────────────────────

export const getCustomerReviews = async (customerUserId: string) => {
  return prisma.review.findMany({
    where: { customerUserId },
    include: {
      event: { select: { id: true, name: true } },
      scores: { include: { criteria: { select: { key: true, label: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ─── Documents (customer view) ─────────────────────────────────────────────────────

export const getCustomerDocuments = async (customerUserId: string) => {
  return prisma.document.findMany({
    where: { event: { customerUserId } },
    include: { event: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
};
