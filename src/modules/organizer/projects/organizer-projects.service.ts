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
      customerUser: { select: { id: true, displayName: true, avatarUrl: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ─── Kanban ───────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { id: "todo", title: "Chờ xử lý" },
  { id: "in_progress", title: "Đang thực hiện" },
  { id: "review", title: "Đang kiểm tra" },
  { id: "done", title: "Hoàn thành" },
] as const;

export const getKanban = async (projectId: string, organizerUserId: string) => {
  const event = await prisma.event.findFirst({
    where: { id: projectId, organizerUserId },
    select: { id: true, name: true, status: true, progressPercent: true },
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

export const createTask = async (input: CreateTaskInput, createdById: string) => {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });
  if (!event) throw createError("NOT_FOUND", "Event not found", 404);

  return prisma.projectTask.create({
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
    },
    include: {
      assignee: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
};

export const getTask = async (taskId: string) => {
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

export const updateTask = async (taskId: string, data: Partial<CreateTaskInput>) => {
  const existing = await prisma.projectTask.findUnique({ where: { id: taskId } });
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
) => {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { status: true },
  });
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

  const [updated] = await prisma.$transaction([
    prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status: input.status,
        ...(input.status === "done" ? { completedAt: new Date() } : {}),
      },
    }),
    prisma.taskStatusHistory.create({
      data: {
        taskId,
        fromStatus: currentStatus,
        toStatus: input.status,
        changedById,
      },
    }),
  ]);

  return updated;
};

export const deleteTask = async (taskId: string) => {
  const existing = await prisma.projectTask.findUnique({ where: { id: taskId } });
  if (!existing) throw createError("NOT_FOUND", "Task not found", 404);
  await prisma.taskStatusHistory.deleteMany({ where: { taskId } });
  await prisma.projectTask.delete({ where: { id: taskId } });
};
