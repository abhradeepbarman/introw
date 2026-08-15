import { Resend } from 'resend';
import { envConfig } from '../config';
import { logger } from '../utils';

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

let resend: Resend | null = null;

const getResend = () => {
  if (!envConfig.RESEND_API_KEY) return null;

  resend ??= new Resend(envConfig.RESEND_API_KEY);

  return resend;
};

export const sendEmail = async ({ to, subject, body }: SendEmailInput) => {
  const client = getResend();

  if (!client) {
    logger.warn(`Resend is not configured — skipped email "${subject}" to ${to}`);
    return;
  }

  const { error } = await client.emails.send({
    from: envConfig.EMAIL_FROM,
    to,
    subject,
    html: body,
  });

  if (error) {
    throw new Error(`Failed to send email "${subject}" to ${to}: ${error.message}`);
  }
};
