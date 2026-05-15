import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { emitNotification } from "../../lib/socket";
import { createError } from "../../middleware/errorHandler";
import type { RegisterInput, LoginInput, ConsultationInput } from "./auth.schema";

const SALT_ROUNDS = 12;
const PORTAL_ROLES = new Set(["admin", "organizer", "customer"]);

const buildAuthUser = (user: {
  id: string;
  email: string;
  role: string;
  displayName: string;
  avatarUrl?: string | null;
}) => ({
  userId: user.id,
  email: user.email,
  role: user.role,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl ?? null,
});

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
    select: { id: true, email: true, role: true, displayName: true, avatarUrl: true },
  });

  const token = signToken({ userId: user.id, role: user.role });

  return {
    accessToken: token,
    user: buildAuthUser(user),
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
      avatarUrl: true,
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

  if (!PORTAL_ROLES.has(user.role)) {
    throw createError("FORBIDDEN", "This account is not allowed to sign in", 403);
  }

  // Update last login (fire-and-forget)
  prisma.user
    .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    .catch(() => {});

  const token = signToken({ userId: user.id, role: user.role });

  return {
    accessToken: token,
    user: buildAuthUser(user),
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    throw createError("NOT_FOUND", "User not found", 404);
  }

  if (user.status !== "active") {
    throw createError("FORBIDDEN", "Account is suspended or inactive", 403);
  }

  if (!PORTAL_ROLES.has(user.role)) {
    throw createError("FORBIDDEN", "This account is not allowed to sign in", 403);
  }

  return buildAuthUser(user);
};

export const logout = async () => {
  return { loggedOut: true };
};

// ─── Consultation Request ─────────────────────────────────────────────────────

const notifyAdminsOfConsultationRequest = async (request: {
  id: string;
  requestCode: string;
  customerName: string;
  eventType: string;
}) => {
  const admins = await prisma.user.findMany({
    where: { role: "admin", status: "active", deletedAt: null },
    select: { id: true },
  });

  await Promise.all(
    admins.map(async (admin) => {
      const notification = await prisma.notification.create({
        data: {
          userId: admin.id,
          scope: "admin",
          type: "request",
          title: "Yeu cau bao gia moi",
          message: `${request.customerName} vua gui yeu cau ${request.requestCode} cho ${request.eventType}`,
          entityType: "consultation_request",
          entityId: request.id,
        },
      });

      emitNotification(admin.id, {
        id: notification.id,
        type: notification.type,
        title: notification.title ?? null,
        message: notification.message,
        entityType: notification.entityType ?? null,
        entityId: notification.entityId ?? null,
        createdAt: notification.createdAt,
      });
    }),
  );
};

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
    select: { id: true, requestCode: true, status: true, customerName: true, eventType: true },
  });

  await notifyAdminsOfConsultationRequest(request).catch((error) => {
    console.warn("[CONSULTATION_NOTIFICATION_FAILED]", error);
  });

  return {
    id: request.id,
    requestCode: request.requestCode,
    status: request.status,
  };
};
