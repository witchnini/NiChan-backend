import { z } from "zod";

export const adminProjectStatusSchema = z.object({
  status: z.enum([
    "draft",
    "planning",
    "quoted",
    "contracted",
    "in_progress",
    "completed",
    "cancelled",
  ]),
});

export const adminProjectOrganizerSchema = z.object({
  organizerUserId: z.string().uuid().nullable(),
});

export const adminProjectNameSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

export type AdminProjectStatusInput = z.infer<typeof adminProjectStatusSchema>;
export type AdminProjectOrganizerInput = z.infer<typeof adminProjectOrganizerSchema>;
export type AdminProjectNameInput = z.infer<typeof adminProjectNameSchema>;
