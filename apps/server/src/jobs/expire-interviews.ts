import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { hangupCall, sendWrapUpInstruction } from '../lib/sideband';
import { logger } from '../utils/logger';

const WRAP_UP_LEAD_MS = 25_000;
const expireInterviews = async () => {
  const running = await prisma.interview.findMany({
    where: { status: 'IN_PROGRESS', startedAt: { not: null } },
    select: { id: true, callId: true, startedAt: true, maxTime: true },
  });

  const now = Date.now();

  for (const interview of running) {
    const endsAt = interview.startedAt!.getTime() + interview.maxTime * 1000;

    if (now >= endsAt - WRAP_UP_LEAD_MS) {
      sendWrapUpInstruction(interview.id);
    }

    if (now >= endsAt) {
      await prisma.interview.update({ where: { id: interview.id }, data: { status: 'COMPLETED' } });
      logger.info(`Interview ${interview.id} expired after ${interview.maxTime}s`);

      if (interview.callId) {
        await hangupCall(interview.callId).catch((error) =>
          logger.warn(`Could not hang up call for interview ${interview.id}: ${error.message}`),
        );
      }
    }
  }
};

export const startInterviewExpiryJob = () => {
  cron.schedule('*/5 * * * * *', () => {
    expireInterviews().catch((error) => logger.error('Failed to expire interviews', error));
  });
};
