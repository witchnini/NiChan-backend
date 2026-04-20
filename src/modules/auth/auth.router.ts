import { Request, Response, Router } from "express";
import { optionalAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../utils/response";
import {
  consultationSchema,
  loginSchema,
  registerSchema,
} from "./auth.schema";
import {
  createConsultationRequest,
  login,
  register,
} from "./auth.service";

export const authRouter = Router();

// POST /api/auth/register
authRouter.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response) => {
    const data = await register(req.body);
    sendSuccess(res, { data, status: 201 });
  },
);

// POST /api/auth/login
authRouter.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const data = await login(req.body);
    sendSuccess(res, { data });
  },
);

// POST /api/public/consultation-requests  (mounted under publicRouter below)
export const consultationRouter = Router();

consultationRouter.post(
  "/consultation-requests",
  optionalAuth,
  validate(consultationSchema),
  async (req: Request, res: Response) => {
    const data = await createConsultationRequest(
      req.body,
      req.user?.userId,
    );
    sendSuccess(res, { data, status: 201 });
  },
);
