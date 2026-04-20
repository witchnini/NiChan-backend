import { Response } from "express";

interface SuccessOptions<T> {
  data: T;
  meta?: Record<string, unknown>;
  status?: number;
}

interface FailOptions {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
  status?: number;
}

export const sendSuccess = <T>(
  res: Response,
  { data, meta, status = 200 }: SuccessOptions<T>,
) => {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

export const sendFail = (
  res: Response,
  { code, message, details, status = 400 }: FailOptions,
) => {
  return res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
};
