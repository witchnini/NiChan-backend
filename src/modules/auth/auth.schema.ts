import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    email: z.string().email("Invalid email"),
    phone: z
      .string()
      .regex(/^0[3-9]\d{8}$/, "Invalid Vietnamese phone number"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const consultationSchema = z.object({
  customerName: z.string().min(1, "Name is required").max(255),
  phone: z.string().regex(/^0[3-9]\d{8}$/, "Invalid Vietnamese phone number"),
  email: z.string().email("Invalid email"),
  eventType: z.string().min(1, "Event type is required").max(100),
  eventDate: z.string().datetime({ offset: true }).optional().nullable(),
  guestCount: z.number().int().positive().optional().nullable(),
  budgetRange: z.string().max(100).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ConsultationInput = z.infer<typeof consultationSchema>;
