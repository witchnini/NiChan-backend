import { Router } from "express";

// Foundation & Auth
import { foundationRouter } from "../modules/foundation/foundation.router";
import { authRouter, consultationRouter } from "../modules/auth/auth.router";

// Public Content
import { publicRouter } from "../modules/public/public.router";

// Customer
import { customerRouter } from "../modules/customer/customer.router";

// Organizer
import { organizerDashboardRouter } from "../modules/organizer/dashboard/organizer-dashboard.router";
import { organizerProjectsRouter } from "../modules/organizer/projects/organizer-projects.router";
import { organizerVendorsRouter } from "../modules/organizer/vendors/organizer-vendors.router";
import { organizerBudgetRouter } from "../modules/organizer/budget/organizer-budget.router";
import { organizerStaffRouter } from "../modules/organizer/staff/organizer-staff.router";
import { organizerCommunicationRouter } from "../modules/organizer/communication/organizer-communication.router";
import { organizerReportsRouter } from "../modules/reports/reports.router";

// Admin
import { adminDashboardRouter } from "../modules/admin/dashboard/admin-dashboard.router";
import { adminRequestsRouter } from "../modules/admin/requests/admin-requests.router";
import { adminProjectsRouter } from "../modules/admin/projects/admin-projects.router";
import { adminUsersRouter } from "../modules/admin/users/admin-users.router";
import { adminContractsRouter } from "../modules/admin/contracts/admin-contracts.router";
import { adminContentRouter } from "../modules/admin/content/admin-content.router";
import { adminFinanceRouter } from "../modules/admin/finance/admin-finance.router";
import { adminStaffRouter } from "../modules/admin/staff/admin-staff.router";
import { adminVendorsRouter } from "../modules/admin/vendors/admin-vendors.router";
import { adminReportsRouter } from "../modules/reports/reports.router";

// Shared Profiles
import { makeProfileRouter } from "../modules/shared/profile.router";
import { uploadRouter } from "../modules/shared/upload.router";

export const apiRouter = Router();

// ─── Foundation ───────────────────────────────────────────────────────────────
apiRouter.use("/", foundationRouter);

// ─── Auth ─────────────────────────────────────────────────────────────────────
apiRouter.use("/auth", authRouter);

// ─── Public ───────────────────────────────────────────────────────────────────
apiRouter.use("/public", publicRouter);
apiRouter.use("/public", consultationRouter);

// ─── Customer ─────────────────────────────────────────────────────────────────
apiRouter.use("/customer", customerRouter);
apiRouter.use("/customer", makeProfileRouter("customer", "admin"));

// ─── Organizer ────────────────────────────────────────────────────────────────
apiRouter.use("/organizer", organizerDashboardRouter);
apiRouter.use("/organizer", organizerProjectsRouter);
apiRouter.use("/organizer", organizerVendorsRouter);
apiRouter.use("/organizer", organizerBudgetRouter);
apiRouter.use("/organizer", organizerReportsRouter);
apiRouter.use("/organizer", organizerCommunicationRouter);
apiRouter.use("/organizer/staff", organizerStaffRouter);
apiRouter.use("/organizer", makeProfileRouter("organizer", "admin"));

// ─── Admin ────────────────────────────────────────────────────────────────────
apiRouter.use("/admin", adminDashboardRouter);
apiRouter.use("/admin/requests", adminRequestsRouter);
apiRouter.use("/admin/projects", adminProjectsRouter);
apiRouter.use("/admin/users", adminUsersRouter);
apiRouter.use("/admin/contracts", adminContractsRouter);
apiRouter.use("/admin/content", adminContentRouter);
apiRouter.use("/admin", adminFinanceRouter);
apiRouter.use("/admin/staff", adminStaffRouter);
apiRouter.use("/admin/vendors", adminVendorsRouter);
apiRouter.use("/admin", adminReportsRouter);
apiRouter.use("/admin", makeProfileRouter("admin"));

// ─── Uploads ──────────────────────────────────────────────────────────────────
apiRouter.use("/upload", uploadRouter);
