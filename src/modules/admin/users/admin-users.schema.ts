import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().regex(/^0[3-9]\d{8}$/, "Invalid Vietnamese phone").optional(),
  role: z.enum(["admin", "organizer", "customer"]),
  password: z.string().min(8, "Min 8 characters"),
  jobTitle: z.string().max(255).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().regex(/^0[3-9]\d{8}$/).optional(),
  jobTitle: z.string().max(255).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["active", "inactive", "suspended"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
