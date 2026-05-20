import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { emitNotification } from "../../../lib/socket";
import { createError } from "../../../middleware/errorHandler";
import {
  emitCustomerNotification,
  ensureCustomerTrackingInTransaction,
} from "../../shared/event-lifecycle.service";
import { REQUEST_STATUS_TRANSITIONS, RequestStatus } from "../../../types/enums";
import type { AssignManagerInput, UpdateRequestStatusInput } from "./admin-requests.schema";

const SALT_ROUNDS = 12;

const parseEventNameFromNote = (note?: string | null) => {
  if (!note) return null;

  const eventNameLine = note
    .split(/\r?\n/)
    .find((line) => line.trim().toLowerCase().startsWith("ten su kien:"));

  if (!eventNameLine) return null;

  const eventName = eventNameLine.split(":").slice(1).join(":").trim();
  return eventName || null;
};

const buildEventName = (request: {
  eventType: string;
  note?: string | null;
}) => parseEventNameFromNote(request.note) ?? request.eventType;

export const listRequests = async (filters: {
  status?: string;
  search?: string;
  managerId?: string;
  skip: number;
  take: number;
  sortBy?: string;
  sortOrder: "asc" | "desc";
}) => {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.managerId ? { assignedManagerId: filters.managerId } : {}),
    ...(filters.search
      ? {
          OR: [
            { customerName: { contains: filters.search } },
            { email: { contains: filters.search } },
            { requestCode: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.consultationRequest.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { [filters.sortBy ?? "createdAt"]: filters.sortOrder },
      include: {
        assignedManager: { select: { id: true, displayName: true, avatarUrl: true } },
        customerUser: { select: { id: true, displayName: true } },
      },
    }),
    prisma.consultationRequest.count({ where }),
  ]);

  return { items, total };
};

export const getRequestById = async (id: string) => {
  const req = await prisma.consultationRequest.findUnique({
    where: { id },
    include: {
      assignedManager: { select: { id: true, displayName: true, avatarUrl: true } },
      customerUser: { select: { id: true, displayName: true } },
      events: { select: { id: true, name: true, status: true } },
    },
  });
  if (!req) throw createError("NOT_FOUND", "Consultation request not found", 404);
  return req;
};

export const assignManager = async (requestId: string, input: AssignManagerInput) => {
  const manager = await prisma.user.findFirst({
    where: { id: input.managerUserId, role: "organizer", deletedAt: null },
  });
  if (!manager) throw createError("NOT_FOUND", "Manager not found", 404);
  if (manager.status !== "active")
    throw createError("CONFLICT", "Manager account is not active", 409);

  const request = await prisma.consultationRequest.findUnique({
    where: { id: requestId },
    include: { events: { select: { id: true } } },
  });
  if (!request) throw createError("NOT_FOUND", "Consultation request not found", 404);

  const existingCustomerUser = request.customerUserId
    ? await prisma.user.findFirst({
        where: { id: request.customerUserId, role: "customer" },
        select: { id: true, role: true },
      })
    : await prisma.user.findUnique({
        where: { email: request.email },
        select: { id: true, role: true },
      });

  if (request.customerUserId && !existingCustomerUser) {
    throw createError("CONFLICT", "Linked customer user is invalid", 409);
  }
  if (existingCustomerUser && existingCustomerUser.role !== "customer") {
    throw createError("CONFLICT", "Request email belongs to a non-customer user", 409);
  }

  const passwordHash = existingCustomerUser
    ? null
    : await bcrypt.hash(`Nichan-${randomUUID()}`, SALT_ROUNDS);

  const { updatedRequest, event, notification } = await prisma.$transaction(async (tx) => {
    const customerUser = existingCustomerUser
      ? await tx.user.update({
          where: { id: existingCustomerUser.id },
          data: {
            deletedAt: null,
            status: "active",
            displayName: request.customerName,
            phone: request.phone,
            customerProfile: {
              upsert: {
                create: { fullName: request.customerName },
                update: { fullName: request.customerName },
              },
            },
          },
          select: { id: true, role: true },
        })
      : await tx.user.create({
          data: {
            email: request.email,
            passwordHash: passwordHash!,
            displayName: request.customerName,
            phone: request.phone,
            role: "customer",
            status: "active",
            customerProfile: { create: { fullName: request.customerName } },
          },
          select: { id: true, role: true },
        });

    const updatedRequest = await tx.consultationRequest.update({
      where: { id: request.id },
      data: {
        assignedManagerId: input.managerUserId,
        customerUserId: customerUser.id,
        ...(request.status === "new" ? { status: "reviewing" } : {}),
      },
      include: {
        assignedManager: { select: { id: true, displayName: true, avatarUrl: true } },
        customerUser: { select: { id: true, displayName: true } },
      },
    });

    const eventName = buildEventName(request);
    const eventData = {
      name: eventName,
      type: request.eventType,
      status: "planning",
      customerUserId: customerUser.id,
      organizerUserId: input.managerUserId,
      consultationRequestId: request.id,
      eventDate: request.eventDate,
      locationText: request.locationText,
      guestCount: request.guestCount,
      summary: request.note,
    };

    const existingEventId = request.events[0]?.id;
    const event = existingEventId
      ? await tx.event.update({
          where: { id: existingEventId },
          data: eventData,
          select: { id: true, name: true, status: true, organizerUserId: true },
        })
      : await tx.event.create({
          data: eventData,
          select: { id: true, name: true, status: true, organizerUserId: true },
        });

    const notification = await tx.notification.create({
      data: {
        userId: input.managerUserId,
        scope: "organizer",
        type: "project",
        title: "Du an moi duoc phan cong",
        message: `Ban duoc phan cong du an ${event.name}`,
        entityType: "event",
        entityId: event.id,
      },
    });

    return { updatedRequest, event, notification };
  });

  emitNotification(input.managerUserId, {
    id: notification.id,
    type: notification.type,
    title: notification.title ?? null,
    message: notification.message,
    entityType: notification.entityType ?? null,
    entityId: notification.entityId ?? null,
    createdAt: notification.createdAt,
  });

  return { ...updatedRequest, project: event };
};

export const updateRequestStatus = async (requestId: string, input: UpdateRequestStatusInput) => {
  const existing = await prisma.consultationRequest.findUnique({
    where: { id: requestId },
    select: {
      status: true,
      events: { select: { id: true, name: true } },
    },
  });
  if (!existing) throw createError("NOT_FOUND", "Request not found", 404);

  const currentStatus = existing.status as RequestStatus;
  const allowed = REQUEST_STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(input.status as RequestStatus)) {
    throw createError(
      "INVALID_STATUS_TRANSITION",
      `Cannot transition from '${currentStatus}' to '${input.status}'`,
      422,
    );
  }

  const timestampField: Record<string, string> = {
    quoted: "quotedAt",
    confirmed: "confirmedAt",
    rejected: "rejectedAt",
  };

  if (input.status === "confirmed" && existing.events.length === 0) {
    throw createError("CONFLICT", "Assign an organizer before confirming this request", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.consultationRequest.update({
      where: { id: requestId },
      data: {
        status: input.status,
        ...(timestampField[input.status] ? { [timestampField[input.status]]: new Date() } : {}),
      },
    });

    if (input.status !== "confirmed") return { updatedRequest, customerNotification: null };

    const event = existing.events[0];
    const tracking = await ensureCustomerTrackingInTransaction(tx, event.id, {
      status: "contracted",
      activityMessage: `Su kien ${event.name} da duoc xac nhan va san sang theo doi.`,
      notificationTitle: "Su kien da duoc xac nhan",
      notificationMessage: `Su kien ${event.name} da duoc xac nhan. Ban co the theo doi tien do tren dashboard.`,
    });

    return { updatedRequest, customerNotification: tracking.notification };
  });

  if (result.customerNotification) emitCustomerNotification(result.customerNotification);
  return result.updatedRequest;
};

export const deleteRequest = async (id: string) => {
  const existing = await prisma.consultationRequest.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Request not found", 404);
  await prisma.consultationRequest.delete({ where: { id } });
};
