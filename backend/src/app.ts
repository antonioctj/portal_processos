import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { notFoundHandler, errorHandler } from "./api/middleware/errorHandler";
import authRoutes from "./api/routes/auth.routes";
import processRoutes from "./api/routes/process.routes";
import documentRoutes from "./api/routes/document.routes";
import gapRoutes from "./api/routes/gap.routes";
import opportunityRoutes from "./api/routes/opportunity.routes";
import chatRoutes from "./api/routes/chat.routes";
import aiProviderRoutes from "./api/routes/aiProvider.routes";
import dashboardRoutes from "./api/routes/dashboard.routes";
import auditRoutes from "./api/routes/audit.routes";
import exportRoutes from "./api/routes/export.routes";
import userRoutes from "./api/routes/user.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== "test" }));

  app.get("/health", (_req, res) => res.json({ status: "ok", app: "ProcessAI" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/processes", processRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/gaps", gapRoutes);
  app.use("/api/opportunities", opportunityRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/ai-providers", aiProviderRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api", exportRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
