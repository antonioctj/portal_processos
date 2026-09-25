import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
  // Nunca logar chaves de API, senhas ou tokens.
  redact: {
    paths: [
      "req.headers.authorization",
      "*.apiKey",
      "*.password",
      "*.passwordHash",
      "*.apiKeyEncrypted",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
});
