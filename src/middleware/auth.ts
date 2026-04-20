import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import { sendFail } from "../utils/response";

// Extend Express Request to carry authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

/**
 * Verifies Bearer JWT and attaches `req.user`.
 * Returns 401 if token is missing or invalid.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    sendFail(res, {
      code: "UNAUTHENTICATED",
      message: "Missing or invalid authorization header",
      status: 401,
    });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    sendFail(res, {
      code: "UNAUTHENTICATED",
      message: "Token is invalid or expired",
      status: 401,
    });
  }
};

/**
 * Optional auth — attaches req.user if token is present, does not reject if empty.
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      // ignore invalid token for optional routes
    }
  }
  next();
};

/**
 * Role guard — must be used AFTER `authenticate`.
 */
export const requireRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendFail(res, {
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
        status: 403,
      });
      return;
    }
    next();
  };
