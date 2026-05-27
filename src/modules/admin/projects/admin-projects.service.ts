import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { emitNotification } from "../../../lib/socket";
import { createError } from "../../../middleware/errorHandler";
import {
  emitCustomerNotification,
  ensureCustomerTrackingInTransaction,
} from "../../shared/event-lifecycle.service";
import type {
  AdminProjectNameInput,
  AdminProjectOrganizerInput,
  AdminProjectStatusInput,
} from "./admin-projects.schema";

const KANBAN_COLUMNS = [
  { id: "todo", title: "Cho xu ly" },
  { id: "in_progress", title: "Dang thuc hien" },
  { id: "review", title: "Dang kiem tra" },
  { id: "done", title: "Hoan thanh" },
] as const;

const SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "eventDate",
  "name",
  "status",
  "progressPercent",
]);

export const listAdminProjects = async (filters: {
  status?: string;
  organizerId?: string;
  search?: string;
  skip: number;
  take: number;
  sortBy?: string;
  sortOrder: "asc" | "desc";
}) => {
  const where: Prisma.EventWhereInput = {
    consultationRequest: { status: "confirmed" },
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.organizerId ? { organizerUserId: filters.organizerId } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search } },
            { type: { contains: filters.search } },
            { customerUser: { displayName: { contains: filters.search } } },
            { organizerUser: { displayName: { contains: filters.search } } },
            { consultationRequest: { requestCode: { contains: filters.search } } },
            { consultationRequest: { customerName: { contains: filters.search } } },
            { consultationRequest: { eventType: { contains: filters.search } } },
            { consultationRequest: { note: { contains: filters.search } } },
          ],
        }
      : {}),
  };

  const sortBy = SORTABLE_FIELDS.has(filters.sortBy ?? "")
    ? filters.sortBy!
    : "createdAt";

  const [items, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { [sortBy]: filters.sortOrder },
      include: {
        customerUser: { select: { id: true, displayName: true, email: true, phone: true } },
        organizerUser: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        consultationRequest: {
          select: {
            id: true,
            requestCode: true,
            status: true,
            customerName: true,
            eventType: true,
            note: true,
          },
        },
        _count: { select: { tasks: true, milestones: true, vendors: true, staffAssignments: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total };
};

export const getAdminProjectById = async (projectId: string) => {
  const project = await prisma.event.findFirst({
    where: { id: projectId, consultationRequest: { status: "confirmed" } },
    include: {
      customerUser: { select: { id: true, displayName: true, email: true, phone: true } },
      organizerUser: { select: { id: true, displayName: true, email: true, phone: true, avatarUrl: true } },
      consultationRequest: true,
      staffAssignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          staffUser: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              staffProfile: { select: { jobTitle: true, employmentStatus: true } },
            },
          },
        },
      },
      milestones: { orderBy: { sortOrder: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { tasks: true, vendors: true, staffAssignments: true, contracts: true } },
    },
  });

  if (!project) throw createError("NOT_FOUND", "Project not found", 404);
  return project;
};

export const getAdminKanban = async (projectId: string) => {
  const event = await prisma.event.findFirst({
    where: { id: projectId, consultationRequest: { status: "confirmed" } },
    select: {
      id: true,
      name: true,
      status: true,
      progressPercent: true,
      customerUser: { select: { id: true, displayName: true } },
      organizerUser: { select: { id: true, displayName: true } },
    },
  });
  if (!event) throw createError("NOT_FOUND", "Project not found", 404);

  const tasks = await prisma.projectTask.findMany({
    where: { eventId: projectId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      assignee: { select: { id: true, displayName: true, avatarUrl: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
  });

  const columns = KANBAN_COLUMNS.map((column) => ({
    ...column,
    tasks: tasks.filter((task) => task.status === column.id),
  }));

  return { project: event, columns };
};

const buildStatusNotification = (eventName: string, status: AdminProjectStatusInput["status"]) => {
  if (status === "contracted") {
    return {
      activityMessage: `Admin đã xác nhận sự kiện ${eventName}.`,
      notificationTitle: "Sự kiện đã được xác nhận",
      notificationMessage: `Sự kiện ${eventName} đã được xác nhận. Bạn có thể theo dõi tiến độ trên dashboard.`,
    };
  }

  if (status === "quoted") {
    return {
      activityMessage: `Admin đã báo giá sự kiện ${eventName}.`,
      notificationTitle: "Sự kiện đã được báo giá",
      notificationMessage: `Sự kiện ${eventName} đã được báo giá. Bạn có thể xem chi tiết trên dashboard.`,
    };
  }

  if (status === "planning") {
    return {
      activityMessage: `Admin đã đưa sự kiện ${eventName} vào giai đoạn lập kế hoạch.`,
      notificationTitle: "Sự kiện đang lập kế hoạch",
      notificationMessage: `Sự kiện ${eventName} đã bắt đầu lập kế hoạch. Bạn có thể theo dõi tiến độ trên dashboard.`,
    };
  }

  if (status === "in_progress") {
    return {
      activityMessage: `Admin đã đưa sự kiện ${eventName} vào giai đoạn triển khai.`,
      notificationTitle: "Sự kiện đang triển khai",
      notificationMessage: `Sự kiện ${eventName} đã bắt đầu triển khai. Timeline và trao đổi được cập nhật trong trang theo dõi.`,
    };
  }

  return {
    activityMessage: `Sự kiện ${eventName} đã được đánh dấu hoàn thành.`,
    notificationTitle: "Sự kiện đã hoàn thành",
    notificationMessage: `Sự kiện ${eventName} đã hoàn thành. Bạn có thể xem lại thông tin và gửi đánh giá.`,
  };
};

export const updateAdminProjectStatus = async (
  projectId: string,
  adminUserId: string,
  input: AdminProjectStatusInput,
) => {
  const event = await prisma.event.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, status: true, customerUserId: true },
  });
  if (!event) throw createError("NOT_FOUND", "Project not found", 404);
  if (event.status === input.status) return event;

  if (["contracted", "quoted", "planning", "in_progress", "completed"].includes(input.status)) {
    const copy = buildStatusNotification(event.name, input.status);
    const result = await prisma.$transaction((tx) =>
      ensureCustomerTrackingInTransaction(tx, projectId, {
        actorUserId: adminUserId,
        status: input.status as "contracted" | "quoted" | "planning" | "in_progress" | "completed",
        ...copy,
      }),
    );
    emitCustomerNotification(result.notification);
    return result.event;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedEvent = await tx.event.update({
      where: { id: projectId },
      data: {
        status: input.status,
        ...(input.status === "cancelled" ? { completedAt: null } : {}),
      },
      select: { id: true, name: true, status: true, progressPercent: true },
    });

    await tx.eventActivity.create({
      data: {
        eventId: projectId,
        actorUserId: adminUserId,
        iconName: input.status === "cancelled" ? "x" : "edit",
        message:
          input.status === "cancelled"
            ? `Admin đã hủy sự kiện ${event.name}.`
            : `Admin đã cập nhật trạng thái sự kiện ${event.name} thành ${input.status}.`,
      },
    });

    const notification =
      input.status === "cancelled"
        ? await tx.notification.create({
            data: {
              userId: event.customerUserId,
              scope: "customer",
              type: "project",
              title: "Sự kiện đã bị hủy",
              message: `Sự kiện ${event.name} đã bị hủy. Vui lòng liên hệ NiChan nếu cần hỗ trợ.`,
              entityType: "event",
              entityId: projectId,
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
          })
        : null;

    return { updatedEvent, notification };
  });

  if (result.notification) emitCustomerNotification(result.notification);
  return result.updatedEvent;
};

export const updateAdminProjectName = async (
  projectId: string,
  adminUserId: string,
  input: AdminProjectNameInput,
) => {
  const project = await prisma.event.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) throw createError("NOT_FOUND", "Project not found", 404);
  if (project.name === input.name) return project;

  return prisma.$transaction(async (tx) => {
    const updatedProject = await tx.event.update({
      where: { id: projectId },
      data: { name: input.name },
      include: {
        customerUser: { select: { id: true, displayName: true, email: true, phone: true } },
        organizerUser: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        consultationRequest: {
          select: {
            id: true,
            requestCode: true,
            status: true,
            customerName: true,
            eventType: true,
            note: true,
          },
        },
        _count: { select: { tasks: true, milestones: true, vendors: true, staffAssignments: true } },
      },
    });

    await tx.eventActivity.create({
      data: {
        eventId: projectId,
        actorUserId: adminUserId,
        iconName: "edit",
        message: `Admin đã đổi tên dự án từ ${project.name} thành ${input.name}.`,
      },
    });

    return updatedProject;
  });
};

export const updateAdminProjectOrganizer = async (
  projectId: string,
  input: AdminProjectOrganizerInput,
) => {
  const project = await prisma.event.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, organizerUserId: true },
  });
  if (!project) throw createError("NOT_FOUND", "Project not found", 404);

  if (input.organizerUserId) {
    const organizer = await prisma.user.findFirst({
      where: {
        id: input.organizerUserId,
        role: "organizer",
        status: "active",
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!organizer) throw createError("NOT_FOUND", "Organizer not found", 404);
  }

  const { updatedProject, notification } = await prisma.$transaction(async (tx) => {
    const updatedProject = await tx.event.update({
      where: { id: projectId },
      data: { organizerUserId: input.organizerUserId },
      include: {
        customerUser: { select: { id: true, displayName: true, email: true } },
        organizerUser: { select: { id: true, displayName: true, email: true } },
        _count: { select: { tasks: true, milestones: true } },
      },
    });

    if (!input.organizerUserId) return { updatedProject, notification: null };

    await tx.eventActivity.create({
      data: {
        eventId: projectId,
        actorUserId: input.organizerUserId,
        iconName: "user",
        message: `Dự án ${project.name} đã được phân công cho organizer.`,
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: input.organizerUserId,
        scope: "organizer",
        type: "project",
        title: "Dự án mới được phân công",
        message: `Bạn được phân công dự án ${project.name}.`,
        entityType: "event",
        entityId: projectId,
      },
    });

    return { updatedProject, notification };
  });

  if (notification) {
    emitNotification(notification.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title ?? null,
      message: notification.message,
      entityType: notification.entityType ?? null,
      entityId: notification.entityId ?? null,
      createdAt: notification.createdAt,
    });
  }

  return updatedProject;
};
