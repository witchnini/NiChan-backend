import { prisma } from "../../lib/prisma";
import { createError } from "../../middleware/errorHandler";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().regex(/^0[3-9]\d{8}$/).optional(),
  address: z.string().max(500).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  jobTitle: z.string().max(255).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8, "Min 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── Get profile ──────────────────────────────────────────────────────────────

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      phone: true,
      avatarUrl: true,
      lastLoginAt: true,
      createdAt: true,
      customerProfile: true,
      organizerProfile: true,
      adminProfile: true,
    },
  });
  if (!user) throw createError("NOT_FOUND", "User not found", 404);
  return user;
};

// ─── Update profile ───────────────────────────────────────────────────────────

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true },
  });
  if (!user) throw createError("NOT_FOUND", "User not found", 404);

  // Update base user
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name ? { displayName: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
  });

  // Update role-specific profile
  const profileData = {
    ...(input.name ? { fullName: input.name } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
  };

  if (user.role === "customer") {
    await prisma.customerProfile.upsert({
      where: { userId },
      create: { userId, fullName: input.name ?? "", ...profileData },
      update: profileData,
    });
  } else if (user.role === "organizer") {
    await prisma.organizerProfile.upsert({
      where: { userId },
      create: { userId, fullName: input.name ?? "", jobTitle: input.jobTitle ?? "", ...profileData },
      update: { ...profileData, ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}) },
    });
  } else if (user.role === "admin") {
    await prisma.adminProfile.upsert({
      where: { userId },
      create: { userId, fullName: input.name ?? "", ...profileData },
      update: profileData,
    });
  }

  return getProfile(userId);
};

// ─── Change password ──────────────────────────────────────────────────────────

export const changePassword = async (userId: string, body: unknown) => {
  const input = changePasswordSchema.parse(body);

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { passwordHash: true },
  });
  if (!user) throw createError("NOT_FOUND", "User not found", 404);

  const valid = await bcrypt.compare(input.oldPassword, user.passwordHash);
  if (!valid) throw createError("FORBIDDEN", "Current password is incorrect", 403);

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { message: "Password changed successfully" };
};
