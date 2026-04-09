import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { apiRouter } from "./routes";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin === "*" ? true : env.corsOrigin,
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_req, res) => {
    res.status(200).json({
      message: "NiChan backend is running",
    });
  });

  app.use("/api", apiRouter);

  app.use((_req, res) => {
    res.status(404).json({
      message: "Route not found",
    });
  });

  return app;
};
