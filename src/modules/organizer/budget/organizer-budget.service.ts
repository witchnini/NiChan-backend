import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const budgetItemSchema = z.object({
  projectBudgetId: z.string().uuid(),
  category: z.string().min(1).max(100),
  estimatedAmount: z.number().nonnegative(),
  actualAmount: z.number().nonnegative().default(0),
  status: z.enum(["planned", "approved", "committed", "paid"]).default("planned"),
  note: z.string().max(500).optional(),
  vendorId: z.string().uuid().optional().nullable(),
});

export type BudgetItemInput = z.infer<typeof budgetItemSchema>;

// ─── Budget ───────────────────────────────────────────────────────────────────

export const getProjectBudget = async (projectId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, budgetEstimated: true, budgetActual: true },
  });
  if (!event) throw createError("NOT_FOUND", "Project not found", 404);

  let budget = await prisma.projectBudget.findFirst({
    where: { eventId: projectId },
    include: {
      items: {
        include: { vendor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Auto-create budget if none exists
  if (!budget) {
    budget = await prisma.projectBudget.create({
      data: { eventId: projectId, name: `Budget - ${event.name}`, currencyCode: "VND" },
      include: { items: { include: { vendor: { select: { id: true, name: true } } } } },
    });
  }

  const items = budget.items;
  const estimatedTotal = items.reduce((acc, i) => acc + Number(i.estimatedAmount), 0);
  const actualTotal = items.reduce((acc, i) => acc + Number(i.actualAmount), 0);

  return { project: event, budget, items, estimatedTotal, actualTotal };
};

export const createBudgetItem = async (input: BudgetItemInput) => {
  const budget = await prisma.projectBudget.findUnique({ where: { id: input.projectBudgetId } });
  if (!budget) throw createError("NOT_FOUND", "Budget not found", 404);

  return prisma.budgetItem.create({
    data: {
      projectBudgetId: input.projectBudgetId,
      category: input.category,
      estimatedAmount: input.estimatedAmount,
      actualAmount: input.actualAmount,
      status: input.status,
      note: input.note,
      vendorId: input.vendorId,
    },
    include: { vendor: { select: { id: true, name: true } } },
  });
};

export const updateBudgetItem = async (id: string, input: Partial<BudgetItemInput>) => {
  const existing = await prisma.budgetItem.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Budget item not found", 404);

  return prisma.budgetItem.update({
    where: { id },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.estimatedAmount !== undefined ? { estimatedAmount: input.estimatedAmount } : {}),
      ...(input.actualAmount !== undefined ? { actualAmount: input.actualAmount } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.vendorId !== undefined ? { vendorId: input.vendorId } : {}),
    },
    include: { vendor: { select: { id: true, name: true } } },
  });
};

export const deleteBudgetItem = async (id: string) => {
  const existing = await prisma.budgetItem.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Budget item not found", 404);
  await prisma.budgetItem.delete({ where: { id } });
};
