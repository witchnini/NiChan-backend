import { z } from "zod";

export const createContractSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  customerUserId: z.string().uuid("Invalid customer user ID"),
  totalValue: z.number().positive("Total value must be positive"),
  versionLabel: z.string().min(1).max(10).default("1.0"),
  scopeText: z.string().min(1, "Scope is required"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  generalTerms: z.string().min(1, "General terms are required"),
});

export const updateContractSchema = z.object({
  totalValue: z.number().positive().optional(),
  versionLabel: z.string().min(1).max(10).optional(),
  scopeText: z.string().min(1).optional(),
  paymentTerms: z.string().min(1).optional(),
  generalTerms: z.string().min(1).optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
