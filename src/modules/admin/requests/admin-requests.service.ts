import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import { REQUEST_STATUS_TRANSITIONS, RequestStatus } from "../../../types/enums";
import type { AssignManagerInput, UpdateRequestStatusInput } from "./admin-requests.schema";

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

  return prisma.consultationRequest.update({
    where: { id: requestId },
    data: { assignedManagerId: input.managerUserId },
  });
};

export const updateRequestStatus = async (requestId: string, input: UpdateRequestStatusInput) => {
  const existing = await prisma.consultationRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
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

  return prisma.consultationRequest.update({
    where: { id: requestId },
    data: {
      status: input.status,
      ...(timestampField[input.status] ? { [timestampField[input.status]]: new Date() } : {}),
    },
  });
};

export const deleteRequest = async (id: string) => {
  const existing = await prisma.consultationRequest.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Request not found", 404);
  await prisma.consultationRequest.delete({ where: { id } });
};
