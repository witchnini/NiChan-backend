import { Request, Response, Router } from "express";
import { authenticate, optionalAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../utils/response";
import {
  consultationSchema,
  loginSchema,
  registerSchema,
} from "./auth.schema";
import {
  createConsultationRequest,
  getCurrentUser,
  login,
  logout,
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

authRouter.get("/me", authenticate, async (req: Request, res: Response) => {
  const data = await getCurrentUser(req.user!.userId);
  sendSuccess(res, { data });
});

authRouter.post("/logout", authenticate, async (_req: Request, res: Response) => {
  const data = await logout();
  sendSuccess(res, { data });
});

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
