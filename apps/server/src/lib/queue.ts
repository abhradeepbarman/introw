import { PgBoss } from 'pg-boss';
import { prisma, type UserType } from '@repo/db';
import { envConfig } from '../config';
import { INTERVIEW_WRAP_UP_SECONDS, MAX_INTERVIEW_MINUTES } from '../constants';
import { logger } from '../utils';
import { warnInterviewEnding } from './sideband';

const WRAP_UP_QUEUE = 'interview-wrap-up';
const HANGUP_QUEUE = 'interview-hangup';
const MESSAGE_QUEUE = 'interview-message';

type CallJob = { callId: string };

type MessageJob = {
  interviewId: string;
  message: string;
  createdBy: UserType;
  createdAt: string;
};

const boss = new PgBoss(envConfig.DIRECT_URL || envConfig.DATABASE_URL);

boss.on('error', (error) => logger.error(error));

const hangup = async (callId: string) => {
  const response = await fetch(`https://api.openai.com/v1/realtime/calls/${callId}/hangup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${envConfig.OPENAI_API_KEY}` },
  });

  // 404 means the call already ended on its own — nothing to retry
  if (!response.ok && response.status !== 404) {
    throw new Error(`Hangup failed for ${callId}: ${response.status} ${await response.text()}`);
  }

  logger.info(`Interview call ${callId} ended`);
};

export const startQueue = async () => {
  await boss.start();
  await boss.createQueue(WRAP_UP_QUEUE);
  await boss.createQueue(HANGUP_QUEUE);
  await boss.createQueue(MESSAGE_QUEUE);

  await boss.work<CallJob>(WRAP_UP_QUEUE, async (jobs) => {
    for (const job of jobs) warnInterviewEnding(job.data.callId);
  });

  await boss.work<CallJob>(HANGUP_QUEUE, async (jobs) => {
    for (const job of jobs) await hangup(job.data.callId);
  });

  await boss.work<MessageJob>(MESSAGE_QUEUE, async (jobs) => {
    await prisma.message.createMany({ data: jobs.map((job) => job.data) });
  });
};

export const queueMessage = async (data: MessageJob) => {
  await boss.send(MESSAGE_QUEUE, data);
};

export const scheduleInterviewEnd = async (callId: string, startedAt: Date) => {
  const endsAt = startedAt.getTime() + MAX_INTERVIEW_MINUTES * 60 * 1000;
  const secondsLeft = Math.max(0, Math.round((endsAt - Date.now()) / 1000));

  await boss.sendAfter(
    WRAP_UP_QUEUE,
    { callId },
    null,
    Math.max(0, secondsLeft - INTERVIEW_WRAP_UP_SECONDS),
  );
  await boss.sendAfter(HANGUP_QUEUE, { callId }, null, secondsLeft);
};
