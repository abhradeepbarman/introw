import WebSocket from 'ws';
import { resumeSchema, type Resume } from '@repo/common/validations';
import type { Interview } from '@repo/db';
import { UserType } from '@repo/db';
import { envConfig } from '../config';
import { INTERVIEW_WRAP_UP_SECONDS } from '../constants';
import { prisma } from '@repo/db';

type GithubRepo = {
  name: string;
  language: string | null;
  description: string | null;
};

const activeSessions = new Map<string, WebSocket>();

export const initSideband = async (callId: string, interview: Interview) => {
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${callId}`, {
    headers: {
      Authorization: `Bearer ${envConfig.OPENAI_API_KEY}`,
    },
  });

  activeSessions.set(callId, ws);

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

  const resume = resumeSchema.safeParse(interview.resumeData);

  const sources = [
    repos.length > 0 && `Candidate's repos:\n${repoSummary}`,
    resume.success &&
      `Candidate's résumé:\n${formatResume(resume.data)}\n\nPress on what the résumé claims — ask them to back up a highlight with specifics.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  ws.on('open', () => {
    console.log('Sideband connected');

    ws.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: `You are an AI interviewer conducting a technical interview.

            Ask one question at a time.
            Evaluate the candidate.
            Ask follow-up questions.

            ${sources}`,
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
    activeSessions.delete(callId);
    await writeQueue;
  });
};

export const warnInterviewEnding = (callId: string) => {
  const ws = activeSessions.get(callId);

  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(
    JSON.stringify({
      type: 'response.create',
      response: {
        instructions: `The interview time is almost up — you have about ${INTERVIEW_WRAP_UP_SECONDS} seconds left.
          Do not ask another question. Wrap up now: give the candidate a brief closing remark, thank them, and end the conversation.`,
      },
    }),
  );
};

const formatResume = (resume: Resume) =>
  [
    resume.headline && `Headline: ${resume.headline}`,
    resume.skills.length > 0 && `Skills: ${resume.skills.join(', ')}`,
    ...resume.experience.map(
      (role) =>
        `- ${role.role} at ${role.company}${role.duration ? ` (${role.duration})` : ''}` +
        role.highlights.map((highlight) => `\n    · ${highlight}`).join(''),
    ),
    ...resume.projects.map(
      (project) =>
        `- Project ${project.name} (${project.technologies.join(', ') || 'unspecified stack'}): ${project.description}`,
    ),
  ]
    .filter(Boolean)
    .join('\n');
