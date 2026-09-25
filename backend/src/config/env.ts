import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET deve ter ao menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  ENCRYPTION_KEY: z
    .string()
    .length(64, "ENCRYPTION_KEY deve ter 64 caracteres hexadecimais (32 bytes)"),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./storage"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY: z.string().optional().default(""),
  S3_SECRET_KEY: z.string().optional().default(""),
  S3_REGION: z.string().optional().default("us-east-1"),

  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("ProcessAI <no-reply@processo.site>"),

  OPENAI_API_KEY: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração de ambiente inválida. Verifique o arquivo .env");
}

export const env = parsed.data;
