import { prisma } from "../../lib/prisma";

// ─── Organizer Reports ────────────────────────────────────────────────────────

export const getOrganizerProjectProgress = async (organizerUserId: string) => {
  const events = await prisma.event.findMany({
    where: { organizerUserId, status: { not: "cancelled" } },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
  });

  return events.map((e) => {
    const total = e.tasks.length;
    const done = e.tasks.filter((t: { status: string }) => t.status === "done").length;
    return {
      id: e.id,
      name: e.name,
      status: e.status,
      eventDate: e.eventDate,
      progressPercent: e.progressPercent,
      taskTotal: total,
      taskDone: done,
      taskPercent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });
};

export const getOrganizerTaskCompletion = async (organizerUserId: string) => {
  return prisma.projectTask.groupBy({
    by: ["status"],
    where: { event: { organizerUserId } },
    _count: { status: true },
    orderBy: { _count: { status: "desc" } },
  });
};

export const getOrganizerBudgetOverview = async (organizerUserId: string) => {
  const events = await prisma.event.findMany({
    where: { organizerUserId },
    include: { budgets: { include: { items: true } } },
  });

  return events.map((e) => {
    const items = e.budgets.flatMap((b: { items: { estimatedAmount: unknown; actualAmount: unknown }[] }) => b.items);
    const estimated = items.reduce((s: number, i: { estimatedAmount: unknown }) => s + Number(i.estimatedAmount), 0);
    const actual = items.reduce((s: number, i: { actualAmount: unknown }) => s + Number(i.actualAmount), 0);
    return { id: e.id, name: e.name, estimated, actual, variance: estimated - actual };
  });
};

// ─── Admin Reports ────────────────────────────────────────────────────────────

export const getAdminConversionReport = async () => {
  const [total, confirmed, rejected] = await prisma.$transaction([
    prisma.consultationRequest.count(),
    prisma.consultationRequest.count({ where: { status: "confirmed" } }),
    prisma.consultationRequest.count({ where: { status: "rejected" } }),
  ]);
  const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  return { total, confirmed, rejected, conversionRate };
};

export const getAdminRevenueByType = async () => {
  const events = await prisma.event.findMany({
    where: { status: "completed" },
    select: { type: true, budgetActual: true },
  });

  const map: Record<string, number> = {};
  for (const e of events) {
    map[e.type] = (map[e.type] ?? 0) + Number(e.budgetActual ?? 0);
  }

  return Object.entries(map).map(([type, revenue]) => ({ type, revenue }));
};

export const getAdminTopEvents = async () => {
  return prisma.event.findMany({
    where: { status: "completed" },
    orderBy: { budgetActual: "desc" },
    take: 10,
    include: {
      customerUser: { select: { id: true, displayName: true } },
      reviews: { select: { ratingOverall: true } },
    },
  });
};

export const getAdminStaffPerformance = async () => {
  const assignments = await prisma.eventStaffAssignment.findMany({
    where: { status: "confirmed" },
    include: {
      staffUser: { select: { id: true, displayName: true, avatarUrl: true } },
      event: { select: { status: true } },
    },
  });

  const staffMap: Record<
    string,
    { id: string; name: string; avatarUrl: string | null; completed: number; total: number }
  > = {};

  for (const a of assignments) {
    const key = a.staffUserId;
    if (!staffMap[key]) {
      staffMap[key] = {
        id: a.staffUserId,
        name: a.staffUser.displayName,
        avatarUrl: a.staffUser.avatarUrl,
        completed: 0,
        total: 0,
      };
    }
    staffMap[key].total += 1;
    if (a.event.status === "completed") staffMap[key].completed += 1;
  }

  return Object.values(staffMap).sort((a, b) => b.completed - a.completed);
};
