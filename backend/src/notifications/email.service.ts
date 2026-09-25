import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    })
  : null;

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/** Envia e-mail via SMTP configurado. Se não houver SMTP configurado (dev), apenas loga. */
export async function sendMail(input: SendMailInput): Promise<{ sent: boolean }> {
  if (!transporter) {
    logger.warn({ to: input.to, subject: input.subject }, "SMTP não configurado — e-mail não enviado (modo dev)");
    return { sent: false };
  }
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to: input.to, subject: input.subject, html: input.html });
    return { sent: true };
  } catch (err) {
    logger.error({ err, to: input.to }, "Falha ao enviar e-mail");
    return { sent: false };
  }
}

export function welcomeEmail(name: string) {
  return {
    subject: "Bem-vindo ao ProcessAI",
    html: `<p>Olá, ${name}!</p><p>Sua organização foi criada com sucesso no <strong>ProcessAI</strong> (processo.site). Comece agora cadastrando ou analisando o primeiro processo de negócio.</p>`,
  };
}

export function userInvitedEmail(name: string, orgName: string, temporaryPassword: string) {
  return {
    subject: `Você foi convidado para o ProcessAI — ${orgName}`,
    html: `<p>Olá, ${name}!</p><p>Você foi adicionado à organização <strong>${orgName}</strong> no ProcessAI.</p><p>Senha temporária: <strong>${temporaryPassword}</strong></p><p>Acesse processo.site e altere sua senha no primeiro acesso.</p>`,
  };
}
