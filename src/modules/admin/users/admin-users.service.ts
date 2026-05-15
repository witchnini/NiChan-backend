import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { createError } from "../../../middleware/errorHandler";
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "./admin-users.schema";

const SALT_ROUNDS = 12;
const PORTAL_ROLES = ["admin", "organizer", "customer"] as const;

const portalRoleFilter = (role?: string) => {
  if (!role) return { in: [...PORTAL_ROLES] };
  return PORTAL_ROLES.includes(role as (typeof PORTAL_ROLES)[number]) ? role : { in: [] };
};

export const listUsers = async (filters: {
  role?: string;
  status?: string;
  search?: string;
  skip: number;
  take: number;
  sortOrder: "asc" | "desc";
}) => {
  const where = {
    deletedAt: null,
    role: portalRoleFilter(filters.role),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { displayName: { contains: filters.search } },
            { email: { contains: filters.search } },
            { phone: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: filters.sortOrder },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        phone: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
        customerProfile: { select: { fullName: true } },
        organizerProfile: { select: { fullName: true, jobTitle: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { id, role: { in: [...PORTAL_ROLES] }, deletedAt: null },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      phone: true,
      avatarUrl: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      customerProfile: true,
      organizerProfile: true,
      adminProfile: true,
    },
  });
  if (!user) throw createError("NOT_FOUND", "User not found", 404);
  return user;
};

export const createUser = async (input: CreateUserInput) => {
  const existing = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  });
  if (existing) throw createError("CONFLICT", "Email already registered", 409);

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const profileCreate = () => {
    switch (input.role) {
      case "customer":
        return { customerProfile: { create: { fullName: input.name } } };
      case "organizer":
        return {
          organizerProfile: {
            create: { fullName: input.name, jobTitle: input.jobTitle ?? "Organizer" },
          },
        };
      case "admin":
        return { adminProfile: { create: { fullName: input.name } } };
      default:
        return {};
    }
  };

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      displayName: input.name,
      phone: input.phone,
      role: input.role,
      status: "active",
      ...profileCreate(),
    },
    select: { id: true, email: true, role: true, displayName: true, status: true },
  });
};

export const updateUser = async (id: string, input: UpdateUserInput) => {
  const existing = await prisma.user.findFirst({ where: { id, role: { in: [...PORTAL_ROLES] }, deletedAt: null } });
  if (!existing) throw createError("NOT_FOUND", "User not found", 404);

  return prisma.user.update({
    where: { id },
    data: {
      ...(input.name ? { displayName: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
    select: { id: true, email: true, displayName: true, role: true, status: true, avatarUrl: true },
  });
};

export const updateUserStatus = async (id: string, input: UpdateUserStatusInput) => {
  const existing = await prisma.user.findFirst({ where: { id, role: { in: [...PORTAL_ROLES] }, deletedAt: null } });
  if (!existing) throw createError("NOT_FOUND", "User not found", 404);

  return prisma.user.update({
    where: { id },
    data: { status: input.status },
    select: { id: true, status: true },
  });
};

export const softDeleteUser = async (id: string) => {
  const existing = await prisma.user.findFirst({ where: { id, role: { in: [...PORTAL_ROLES] }, deletedAt: null } });
  if (!existing) throw createError("NOT_FOUND", "User not found", 404);

  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "inactive" },
  });
};
