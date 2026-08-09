import WebSocket from 'ws';
import type { Interview } from '@repo/db';
import { UserType } from '@repo/db';
import envConfig from '../config/env';
import { prisma } from '@repo/db';

type GithubRepo = {
  name: string;
  language: string | null;
  description: string | null;
};

const liveSessions = new Map<string, WebSocket>();

export const sendWrapUpInstruction = (interviewId: string) => {
  const ws = liveSessions.get(interviewId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  liveSessions.delete(interviewId);

  ws.send(
    JSON.stringify({
      type: 'response.create',
      response: {
        instructions:
          'Time is almost up. Do not ask another question STRICTLY after that — thank the candidate briefly and close out the interview now.',
      },
    }),
  );
};

const describeDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds} seconds`;
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};

export const hangupCall = async (callId: string) => {
  const response = await fetch(`https://api.openai.com/v1/realtime/calls/${callId}/hangup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${envConfig.OPENAI_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Hangup failed with ${response.status}: ${await response.text()}`);
  }
};

export const initSideband = async (callId: string, interview: Interview, remainingTime: number) => {
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${callId}`, {
    headers: {
      Authorization: `Bearer ${envConfig.OPENAI_API_KEY}`,
    },
  });

  let writeQueue: Promise<unknown> = Promise.resolve();

  const saveMessage = (message: string, createdBy: UserType) => {
    const text = message?.trim();
    if (!text) return;

    writeQueue = writeQueue
      .then(() =>
        prisma.message.create({
          data: { interviewId: interview.id, message: text, createdBy },
        }),
      )
      .catch((err) => {
        console.error('❌ Failed to save message:', err);
      });
  };

  const repos = (interview.githubMetadata as GithubRepo[] | null) ?? [];
  const repoSummary = repos
    .map((r) => `- ${r.name} (${r.language ?? 'unknown'}): ${r.description ?? 'no description'}`)
    .join('\n');

  ws.on('open', () => {
    console.log('✅ Sideband connected');

    ws.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: `You are an AI interviewer conducting a technical interview.

            You have ${describeDuration(remainingTime)} in total. Pace yourself so you can
            cover ground and still close cleanly — keep your questions and answers short,
            and do not open a new line of questioning near the end. You will be told when
            it is time to wrap up.

            Ask one question at a time.
            Evaluate the candidate.
            Ask follow-up questions.

            Candidate's repos:
            ${repoSummary}`,
        },
      }),
    );

    liveSessions.set(interview.id, ws);
  });

  ws.on('message', (message) => {
    const event = JSON.parse(message.toString());

    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        console.log('👤 User:', event.transcript);
        saveMessage(event.transcript, UserType.CANDIDATE);
        break;

      case 'response.output_item.done': {
        const item = event.item;

        if (item?.type === 'message' && item.role === 'assistant') {
          const text = item.content
            ?.map((c: any) => c.transcript ?? c.text)
            ?.filter(Boolean)
            ?.join('');

          if (text) {
            console.log('🤖 Assistant:', text);
            saveMessage(text, UserType.INTERVIEWER);
          }
        }

        break;
      }

      case 'error':
        console.error('❌ Realtime API error:', event.error);
        break;
    }
  });

  ws.on('error', console.error);

  ws.on('close', async () => {
    console.log('❌ Sideband disconnected');
    liveSessions.delete(interview.id);
    await writeQueue;
  });
};
