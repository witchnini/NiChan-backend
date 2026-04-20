import { Request } from "express";

/**
 * Extract a route param as string (workaround for @types/express v5 typing string | string[])
 */
export const p = (req: Request, key: string): string => String(req.params[key]);

/**
 * Extract a query param as string or undefined
 */
export const q = (req: Request, key: string): string | undefined => {
  const val = req.query[key];
  if (!val) return undefined;
  return String(val);
};
