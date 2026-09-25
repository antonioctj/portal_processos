import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const key = Buffer.from(env.ENCRYPTION_KEY, "hex");

/**
 * Criptografa um segredo (ex: API key de provedor de IA) para armazenamento no banco.
 * Formato do payload: iv:authTag:cipherText (hex), nunca reversível sem ENCRYPTION_KEY.
 */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, cipherHex] = payload.split(":");
  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error("Payload criptografado inválido");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Mascara uma API key para exibição no frontend, ex: sk-••••••••••••••••8F92 */
export function maskApiKey(plainText: string): string {
  if (plainText.length <= 8) return "••••••••";
  const prefix = plainText.slice(0, 3);
  const suffix = plainText.slice(-4);
  return `${prefix}${"•".repeat(16)}${suffix}`;
}

export function last4(plainText: string): string {
  return plainText.slice(-4);
}

export function sha256(content: Buffer | string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}
