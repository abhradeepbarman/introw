import nodemailer from 'nodemailer';
import envConfig from '../config/env';
import { logger } from '../utils/logger';

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!envConfig.SMTP_HOST) return null;

  transporter ??= nodemailer.createTransport({
    host: envConfig.SMTP_HOST,
    port: envConfig.SMTP_PORT,
    secure: envConfig.SMTP_PORT === 465,
    auth: { user: envConfig.SMTP_USER, pass: envConfig.SMTP_PASSWORD },
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, body }: SendEmailInput) => {
  const mailer = getTransporter();

  // Without SMTP configured the reset flow still has to succeed, so log the
  // mail instead of failing the request.
  if (!mailer) {
    logger.warn(`SMTP is not configured — skipped email "${subject}" to ${to}`);
    return;
  }

  await mailer.sendMail({ from: envConfig.EMAIL_FROM, to, subject, html: body });
};
