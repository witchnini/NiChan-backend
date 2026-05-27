import { z } from "zod";

export const createTaskSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(2000).optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigneeUserId: z.string().uuid().optional().nullable(),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done"]),
});

export const updateProjectStatusSchema = z.object({
  status: z.enum([
    "planning",
    "quoted",
    "contracted",
    "in_progress",
    "completed",
    "cancelled",
  ]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;
