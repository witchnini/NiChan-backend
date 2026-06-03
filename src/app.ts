import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export const createApp = () => {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigin === "*" ? true : env.corsOrigin,
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      data: { message: "NiChan backend is running" },
    });
  });

  app.use("/api", apiRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  // Global error handler — MUST be last
  app.use(errorHandler);

  return app;
};
