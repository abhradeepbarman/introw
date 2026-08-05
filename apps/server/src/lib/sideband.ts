import WebSocket from 'ws';
import type { Interview } from '../../generated/prisma/client';
import { UserType } from '../../generated/prisma/enums';
import envConfig from '../config/env';
import { prisma } from '../lib/prisma';

type GithubRepo = {
  name: string;
  language: string | null;
  description: string | null;
};

export const initSideband = async (callId: string, interview: Interview) => {
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

            Ask one question at a time.
            Evaluate the candidate.
            Ask follow-up questions.

            Candidate's repos:
            ${repoSummary}`,
        },
      }),
    );
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
    await writeQueue;
  });
};
