import { NextFunction, Request, Response } from "express";
import { ZodObject, ZodRawShape, ZodError } from "zod";

/**
 * Validate req.body against a Zod schema.
 * Throws ZodError so errorHandler can format it uniformly.
 */
export const validate =
  (schema: ZodObject<ZodRawShape>) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
      } else {
        next(err);
      }
    }
  };

/**
 * Validate req.query against a Zod schema.
 * Returns parsed query instead of assigning to req.query (avoids ParsedQs conflict).
 */
export const validateQuery =
  (schema: ZodObject<ZodRawShape>) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      (req as Request & { parsedQuery: unknown }).parsedQuery =
        await schema.parseAsync(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
