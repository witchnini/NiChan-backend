import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import {
  activateCustomerTracking,
  emitCustomerNotification,
  ensureCustomerTrackingInTransaction,
} from "../../shared/event-lifecycle.service";
import { TASK_STATUS_TRANSITIONS, TaskStatus } from "../../../types/enums";
import type {
  CreateTaskInput,
  UpdateProjectStatusInput,
  UpdateTaskStatusInput,
} from "./organizer-projects.schema";

// ─── Projects List ────────────────────────────────────────────────────────────

export const listOrganizerProjects = async (organizerUserId: string) => {
  return prisma.event.findMany({
    where: { organizerUserId, status: { not: "cancelled" } },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      eventDate: true,
      guestCount: true,
      progressPercent: true,
      locationText: true,
      customerUser: { select: { id: true, displayName: true, avatarUrl: true, email: true, phone: true } },
      _count: { select: { tasks: true, milestones: true, vendors: true, staffAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getOrganizerProjectById = async (projectId: string, organizerUserId: string) => {
  const project = await prisma.event.findFirst({
    where: { id: projectId, organizerUserId },
    include: {
      customerUser: { select: { id: true, displayName: true, avatarUrl: true, email: true, phone: true } },
      organizerUser: { select: { id: true, displayName: true, avatarUrl: true, email: true, phone: true } },
      consultationRequest: { select: { id: true, requestCode: true, status: true, budgetRange: true } },
      milestones: { orderBy: { sortOrder: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 12 },
      _count: { select: { tasks: true, vendors: true, staffAssignments: true, contracts: true, documents: true } },
    },
  });
  if (!project) throw createError("NOT_FOUND", "Project not found", 404);
  return project;
};

// ─── Kanban ───────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { id: "todo", title: "Chờ xử lý" },
  { id: "in_progress", title: "Đang thực hiện" },
  { id: "review", title: "Đang kiểm tra" },
  { id: "done", title: "Hoàn thành" },
] as const;

export const recalculateProjectProgress = async (
  tx: Prisma.TransactionClient,
  eventId: string,
) => {
  const total = await tx.projectTask.count({ where: { eventId } });
  const done = total > 0 ? await tx.projectTask.count({ where: { eventId, status: "done" } }) : 0;
  const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

  return tx.event.update({
    where: { id: eventId },
    data: { progressPercent },
    select: { id: true, progressPercent: true },
  });
};

export const getKanban = async (projectId: string, organizerUserId: string) => {
  const event = await prisma.event.findFirst({
    where: { id: projectId, organizerUserId },
    select: {
      id: true,
      name: true,
      status: true,
      eventDate: true,
      guestCount: true,
      progressPercent: true,
      customerUser: { select: { id: true, displayName: true, avatarUrl: true } },
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

  const columns = KANBAN_COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.id),
  }));

  return { project: event, columns };
};

export const updateProjectStatus = async (
  projectId: string,
  organizerUserId: string,
  input: UpdateProjectStatusInput,
) => {
  const event = await prisma.event.findFirst({
    where: { id: projectId, organizerUserId },
    select: { id: true, name: true, status: true },
  });
  if (!event) throw createError("NOT_FOUND", "Project not found", 404);
  if (event.status === input.status) return event;

  const allowed: Record<string, UpdateProjectStatusInput["status"][]> = {
    planning: ["in_progress"],
    quoted: ["in_progress"],
    contracted: ["in_progress"],
    in_progress: ["completed"],
  };
  if (!(allowed[event.status] ?? []).includes(input.status)) {
    throw createError(
      "INVALID_STATUS_TRANSITION",
      `Cannot transition project from '${event.status}' to '${input.status}'`,
      422,
    );
  }

  if (input.status === "in_progress") {
    return activateCustomerTracking(projectId, {
      actorUserId: organizerUserId,
      status: "in_progress",
      activityMessage: `Ban to chuc da bat dau trien khai su kien ${event.name}.`,
      notificationTitle: "Su kien da bat dau trien khai",
      notificationMessage: `Ban to chuc da bat dau trien khai su kien ${event.name}. Hay theo doi timeline va trao doi tren dashboard.`,
    });
  }

  const result = await prisma.$transaction((tx) =>
    ensureCustomerTrackingInTransaction(tx, projectId, {
      actorUserId: organizerUserId,
      status: "completed",
      activityMessage: `Su kien ${event.name} da duoc danh dau hoan thanh.`,
      notificationTitle: "Su kien da hoan thanh",
      notificationMessage: `Su kien ${event.name} da hoan thanh. Ban co the xem lai tai lieu, thanh toan va gui danh gia.`,
    }),
  );
  emitCustomerNotification(result.notification);
  return result.event;
};

// ─── Tasks CRUD ───────────────────────────────────────────────────────────────

export const createTask = async (
  input: CreateTaskInput,
  createdById: string,
  organizerUserId?: string,
) => {
  const event = await prisma.event.findFirst({
    where: {
      id: input.eventId,
      ...(organizerUserId ? { organizerUserId } : {}),
    },
    select: { id: true },
  });
  if (!event) throw createError("NOT_FOUND", "Event not found", 404);

  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.create({
      data: {
        eventId: input.eventId,
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        priority: input.priority,
        assigneeUserId: input.assigneeUserId ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        sortOrder: input.sortOrder,
        createdById,
        ...(input.status === "done" ? { completedAt: new Date() } : {}),
      },
      include: {
        assignee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    await recalculateProjectProgress(tx, input.eventId);
    return task;
  });
};

const getTaskForOrganizer = async (taskId: string, organizerUserId?: string) => {
  return prisma.projectTask.findFirst({
    where: {
      id: taskId,
      ...(organizerUserId ? { event: { organizerUserId } } : {}),
    },
    select: { id: true, eventId: true, status: true },
  });
};

export const getTask = async (taskId: string, organizerUserId?: string) => {
  const existing = await getTaskForOrganizer(taskId, organizerUserId);
  if (!existing) throw createError("NOT_FOUND", "Task not found", 404);

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, displayName: true, avatarUrl: true } },
      createdBy: { select: { id: true, displayName: true } },
      statusHistories: { orderBy: { changedAt: "desc" }, take: 10 },
    },
  });
  if (!task) throw createError("NOT_FOUND", "Task not found", 404);
  return task;
};

export const updateTask = async (
  taskId: string,
  data: Partial<CreateTaskInput>,
  organizerUserId?: string,
) => {
  const existing = await getTaskForOrganizer(taskId, organizerUserId);
  if (!existing) throw createError("NOT_FOUND", "Task not found", 404);

  return prisma.projectTask.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.assigneeUserId !== undefined ? { assigneeUserId: data.assigneeUserId } : {}),
      ...(data.dueAt !== undefined ? { dueAt: data.dueAt ? new Date(data.dueAt) : null } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
    include: { assignee: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
};

export const updateTaskStatus = async (
  taskId: string,
  input: UpdateTaskStatusInput,
  changedById: string,
  organizerUserId?: string,
) => {
  const task = await getTaskForOrganizer(taskId, organizerUserId);
  if (!task) throw createError("NOT_FOUND", "Task not found", 404);

  const currentStatus = task.status as TaskStatus;
  const allowed = TASK_STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(input.status as TaskStatus)) {
    throw createError(
      "INVALID_STATUS_TRANSITION",
      `Cannot transition from '${currentStatus}' to '${input.status}'`,
      422,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.projectTask.update({
      where: { id: taskId },
      data: {
        status: input.status,
        completedAt: input.status === "done" ? new Date() : null,
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        taskId,
        fromStatus: currentStatus,
        toStatus: input.status,
        changedById,
      },
    });

    await recalculateProjectProgress(tx, task.eventId);
    return updated;
  });
};

export const deleteTask = async (taskId: string, organizerUserId?: string) => {
  const existing = await getTaskForOrganizer(taskId, organizerUserId);
  if (!existing) throw createError("NOT_FOUND", "Task not found", 404);
  await prisma.$transaction(async (tx) => {
    await tx.taskStatusHistory.deleteMany({ where: { taskId } });
    await tx.projectTask.delete({ where: { id: taskId } });
    await recalculateProjectProgress(tx, existing.eventId);
  });
};
