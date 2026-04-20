import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

// Prisma known error codes
const PRISMA_UNIQUE_VIOLATION = "P2002";
const PRISMA_NOT_FOUND = "P2025";
const PRISMA_FOREIGN_KEY_CONSTRAINT = "P2003";
const PRISMA_CONSTRAINT_FAILED = "P2004";

class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const createError = (
  code: string,
  message: string,
  status: number,
): AppError => new AppError(code, message, status);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // ── Zod validation ────────────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body is invalid",
        details: err.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
    return;
  }

  // ── AppError (business logic) ─────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  // ── Prisma Client errors ───────────────────────────────────────────────────
  const prismaErr = err as {
    code?: string;
    meta?: { cause?: string; target?: string[] };
    name?: string;
    errorCode?: string;
  };

  // Cannot connect to database server (PrismaClientInitializationError)
  if (
    prismaErr.name === "PrismaClientInitializationError" ||
    prismaErr.errorCode === "P1001"
  ) {
    console.error("[DB CONNECTION ERROR]", err.message);
    res.status(503).json({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Database is temporarily unavailable. Please try again later.",
      },
    });
    return;
  }

  // Unique constraint violation
  if (prismaErr.code === PRISMA_UNIQUE_VIOLATION) {
    const field = prismaErr.meta?.target?.join(", ") ?? "field";
    res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: `A record with this ${field} already exists` },
    });
    return;
  }

  // Record not found
  if (prismaErr.code === PRISMA_NOT_FOUND) {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: prismaErr.meta?.cause ?? "Resource not found",
      },
    });
    return;
  }

  // Foreign key constraint
  if (
    prismaErr.code === PRISMA_FOREIGN_KEY_CONSTRAINT ||
    prismaErr.code === PRISMA_CONSTRAINT_FAILED
  ) {
    res.status(409).json({
      success: false,
      error: {
        code: "CONSTRAINT_VIOLATION",
        message: "Operation failed due to a data relationship constraint",
      },
    });
    return;
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  // Only log truly unhandled errors
  if (process.env.NODE_ENV !== "production") {
    console.error("[UNHANDLED ERROR]", err.name, err.message);
  }
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
