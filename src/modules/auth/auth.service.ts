import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { createError } from "../../middleware/errorHandler";
import type { RegisterInput, LoginInput, ConsultationInput } from "./auth.schema";

const SALT_ROUNDS = 12;

// ─── Register ─────────────────────────────────────────────────────────────────

export const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  });
  if (existing) {
    throw createError("CONFLICT", "Email already registered", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      displayName: input.name,
      phone: input.phone,
      role: "customer",
      status: "active",
      customerProfile: {
        create: { fullName: input.name },
      },
    },
    select: { id: true, email: true, role: true, displayName: true },
  });

  const token = signToken({ userId: user.id, role: user.role });

  return {
    accessToken: token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
  };
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      displayName: true,
    },
  });

  if (!user) {
    throw createError("UNAUTHENTICATED", "Invalid email or password", 401);
  }

  if (user.status !== "active") {
    throw createError("FORBIDDEN", "Account is suspended or inactive", 403);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw createError("UNAUTHENTICATED", "Invalid email or password", 401);
  }

  // Update last login (fire-and-forget)
  prisma.user
    .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    .catch(() => {});

  const token = signToken({ userId: user.id, role: user.role });

  return {
    accessToken: token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
  };
};

// ─── Consultation Request ─────────────────────────────────────────────────────

export const createConsultationRequest = async (
  input: ConsultationInput,
  customerUserId?: string,
) => {
  // Generate request code: YC-YYYY-NNN
  const year = new Date().getFullYear();
  const count = await prisma.consultationRequest.count({
    where: { requestCode: { startsWith: `YC-${year}-` } },
  });
  const requestCode = `YC-${year}-${String(count + 1).padStart(3, "0")}`;

  const request = await prisma.consultationRequest.create({
    data: {
      requestCode,
      customerName: input.customerName,
      phone: input.phone,
      email: input.email,
      eventType: input.eventType,
      eventDate: input.eventDate ? new Date(input.eventDate) : null,
      guestCount: input.guestCount ?? null,
      budgetRange: input.budgetRange ?? null,
      locationText: input.location ?? null,
      note: input.note ?? null,
      status: "new",
      customerUserId: customerUserId ?? null,
    },
    select: { id: true, requestCode: true, status: true },
  });

  return {
    id: request.id,
    requestCode: request.requestCode,
    status: request.status,
  };
};
