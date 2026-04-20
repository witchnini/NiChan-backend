import { Request, Response, Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../utils/response";
import { updateProfileSchema, getProfile, updateProfile, changePassword } from "./profile.service";

// ─── Factory: creates GET/PUT/password router for any role ────────────────────

export const makeProfileRouter = (...roles: string[]) => {
  const router = Router();
  router.use(authenticate, requireRole(...roles));

  // GET /api/{role}/profile
  router.get("/profile", async (req: Request, res: Response) => {
    const data = await getProfile(req.user!.userId);
    sendSuccess(res, { data });
  });

  // PUT /api/{role}/profile
  router.put(
    "/profile",
    validate(updateProfileSchema),
    async (req: Request, res: Response) => {
      const data = await updateProfile(req.user!.userId, req.body);
      sendSuccess(res, { data });
    },
  );

  // PUT /api/{role}/profile/password
  router.put("/profile/password", async (req: Request, res: Response) => {
    const data = await changePassword(req.user!.userId, req.body);
    sendSuccess(res, { data });
  });

  return router;
};
