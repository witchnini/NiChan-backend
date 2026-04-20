import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import type { CreateContractInput, UpdateContractInput } from "./admin-contracts.schema";

export const listContracts = async (filters: {
  status?: string;
  search?: string;
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
}) => {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { contractCode: { contains: filters.search } },
            { event: { name: { contains: filters.search } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.contract.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: filters.sortOrder },
      include: {
        event: { select: { id: true, name: true, type: true } },
        customerUser: { select: { id: true, displayName: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    }),
    prisma.contract.count({ where }),
  ]);

  return { items, total };
};

export const getContractById = async (id: string) => {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, name: true, type: true, status: true } },
      customerUser: { select: { id: true, displayName: true, phone: true } },
      createdBy: { select: { id: true, displayName: true } },
      versions: { orderBy: { createdAt: "desc" } },
      documents: true,
    },
  });
  if (!contract) throw createError("NOT_FOUND", "Contract not found", 404);
  return contract;
};

export const createContract = async (input: CreateContractInput, createdById: string) => {
  const year = new Date().getFullYear();
  const count = await prisma.contract.count({
    where: { contractCode: { startsWith: `HD-${year}-` } },
  });
  const contractCode = `HD-${year}-${String(count + 1).padStart(3, "0")}`;

  const contract = await prisma.contract.create({
    data: {
      contractCode,
      eventId: input.eventId,
      customerUserId: input.customerUserId,
      totalValue: input.totalValue,
      currentVersion: input.versionLabel,
      createdById,
      status: "draft",
      versions: {
        create: {
          versionLabel: input.versionLabel,
          scopeText: input.scopeText,
          paymentTerms: input.paymentTerms,
          generalTerms: input.generalTerms,
          createdById,
        },
      },
    },
    include: { versions: true },
  });

  return contract;
};

export const updateContract = async (
  id: string,
  input: UpdateContractInput,
  updatedById: string,
) => {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Contract not found", 404);

  const hasContentChange =
    input.scopeText || input.paymentTerms || input.generalTerms || input.versionLabel;

  return prisma.$transaction(async (tx) => {
    if (hasContentChange) {
      const versionLabel = input.versionLabel ?? existing.currentVersion;
      await tx.contractVersion.create({
        data: {
          contractId: id,
          versionLabel,
          scopeText: input.scopeText ?? "",
          paymentTerms: input.paymentTerms ?? "",
          generalTerms: input.generalTerms ?? "",
          createdById: updatedById,
        },
      });
    }

    return tx.contract.update({
      where: { id },
      data: {
        ...(input.totalValue !== undefined ? { totalValue: input.totalValue } : {}),
        ...(input.versionLabel !== undefined ? { currentVersion: input.versionLabel } : {}),
      },
    });
  });
};

export const sendContract = async (id: string) => {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Contract not found", 404);
  if (existing.status !== "draft")
    throw createError("CONFLICT", "Only draft contracts can be sent", 409);

  return prisma.contract.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });
};

export const deleteContract = async (id: string) => {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) throw createError("NOT_FOUND", "Contract not found", 404);
  await prisma.contractVersion.deleteMany({ where: { contractId: id } });
  await prisma.contract.delete({ where: { id } });
};
