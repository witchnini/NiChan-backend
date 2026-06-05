import { prisma } from "../../../lib/prisma";
import { z } from "zod";

export const transactionSchema = z.object({
  eventId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  transactionDate: z.string().datetime({ offset: true }),
  paymentMethod: z.string().max(100).optional(),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

// ─── Finance Reports ──────────────────────────────────────────────────────────

export const getProjectSummary = async () => {
  const events = await prisma.event.findMany({
    where: { status: { not: "cancelled" } },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      budgetEstimated: true,
      budgetActual: true,
      transactions: { select: { amount: true, status: true } },
    },
  });

  return events.map((e) => {
    const totalCollected = e.transactions
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      id: e.id,
      name: e.name,
      type: e.type,
      status: e.status,
      budgetEstimated: Number(e.budgetEstimated ?? 0),
      budgetActual: Number(e.budgetActual ?? 0),
      totalCollected,
    };
  });
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const getMonthlyPL = async () => {
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [transactions, budgetItems] = await Promise.all([
    prisma.transaction.findMany({
      where: { transactionDate: { gte: twelveMonthsAgo } },
      select: { amount: true, status: true, transactionDate: true },
    }),
    prisma.budgetItem.findMany({
      where: { status: "paid", updatedAt: { gte: twelveMonthsAgo } },
      select: { actualAmount: true, updatedAt: true },
    }),
  ]);

  const map: Record<string, { revenue: number; expenses: number }> = {};
  // Pre-seed the last 12 months so the chart shows a continuous timeline.
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    map[monthKey(d)] = { revenue: 0, expenses: 0 };
  }

  for (const tx of transactions) {
    const key = monthKey(tx.transactionDate);
    if (!map[key]) map[key] = { revenue: 0, expenses: 0 };
    if (tx.status === "completed") map[key].revenue += Number(tx.amount);
  }

  for (const item of budgetItems) {
    const key = monthKey(item.updatedAt);
    if (!map[key]) map[key] = { revenue: 0, expenses: 0 };
    map[key].expenses += Number(item.actualAmount);
  }

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data, profit: data.revenue - data.expenses }));
};

export const getExpenses = async () => {
  const items = await prisma.budgetItem.findMany({
    where: { status: { in: ["committed", "paid"] } },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return items;
};

// ─── Transactions CRUD ────────────────────────────────────────────────────────

export const listTransactions = async (filters: {
  eventId?: string;
  status?: string;
  skip: number;
  take: number;
}) => {
  const where = {
    ...(filters.eventId ? { eventId: filters.eventId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { transactionDate: "desc" },
      include: { event: { select: { id: true, name: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);
  return { items, total };
};

export const createTransaction = async (input: TransactionInput) => {
  return prisma.transaction.create({
    data: {
      eventId: input.eventId,
      contractId: input.contractId,
      description: input.description,
      amount: input.amount,
      transactionDate: new Date(input.transactionDate),
      paymentMethod: input.paymentMethod,
      status: input.status,
    },
  });
};

export const updateTransaction = async (id: string, input: Partial<TransactionInput>) => {
  return prisma.transaction.update({
    where: { id },
    data: {
      ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
      ...(input.contractId !== undefined ? { contractId: input.contractId } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.transactionDate !== undefined ? { transactionDate: new Date(input.transactionDate) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
    },
  });
};
