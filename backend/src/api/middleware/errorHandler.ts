import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/errors";
import { logger } from "../../config/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Rota não encontrada", path: req.path });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(422).json({ error: "Dados inválidos", details: err.flatten() });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  logger.error({ err }, "Erro não tratado");
  res.status(500).json({ error: "Erro interno do servidor" });
}
