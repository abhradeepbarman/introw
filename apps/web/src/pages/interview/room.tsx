import { Brand } from '@/components/common/brand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-error';
import {
  completeInterview,
  createInterviewSession,
  getInterview,
} from '@/services/interview.service';
import type { LucideIcon } from 'lucide-react';
import { Bot, CreditCard, FileText, Mic, MicOff, PhoneOff, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type Status = 'checking' | 'idle' | 'connecting' | 'live' | 'ended' | 'error';

const SPEAKING_THRESHOLD = 0.02;
const LEVEL_DECAY = 0.85;

const startMicMeter = (stream: MediaStream, onChange: (speaking: boolean) => void) => {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  context.createMediaStreamSource(stream).connect(analyser);

  const samples = new Float32Array(analyser.fftSize);
  let frameId = 0;
  let level = 0;
  let speaking = false;

  const frame = () => {
    analyser.getFloatTimeDomainData(samples);

    let total = 0;
    for (let i = 0; i < samples.length; i += 1) total += samples[i]! * samples[i]!;
    level = Math.max(Math.sqrt(total / samples.length), level * LEVEL_DECAY);

    const next = level > SPEAKING_THRESHOLD;
    if (next !== speaking) {
      speaking = next;
      onChange(next);
    }

    frameId = requestAnimationFrame(frame);
  };

  frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    void context.close();
  };
};

const InterviewRoomPage = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);
  const [outOfSessions, setOutOfSessions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const stopMicMeterRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  //#region Cleanup and teardown
  const teardown = useCallback(() => {
    stopMicMeterRef.current?.();
    stopMicMeterRef.current = null;

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    if (peerRef.current) {
      // detach first, or closing re-enters through onconnectionstatechange
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    if (audioRef.current) audioRef.current.srcObject = null;
  }, []);

  const end = useCallback(() => {
    teardown();
    if (interviewId) void completeInterview(interviewId).catch(() => {});
    navigate(`/interview/${interviewId}/result`, { replace: true });
  }, [interviewId, navigate, teardown]);

  const endOnDisconnect = useCallback(() => {
    teardown();
    if (interviewId) void completeInterview(interviewId).catch(() => {});
    setStatus('ended');
  }, [interviewId, teardown]);

  useEffect(() => teardown, [teardown]);
  //#endregion

  //#region Resume guard
  useEffect(() => {
    if (!interviewId) return;
    let active = true;

    getInterview(interviewId)
      .then(async ({ status: current }) => {
        if (current === 'PENDING') {
          if (active) setStatus('idle');
          return;
        }

        // the page was reloaded or reopened, so the one live session is over
        if (current === 'IN_PROGRESS') await completeInterview(interviewId);
        if (active) setStatus('ended');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        console.error('Failed to load the interview:', cause);
        setStatus('error');
        setError(describeError(cause));
      });

    return () => {
      active = false;
    };
  }, [interviewId]);
  //#endregion

  //#region Join
  const join = useCallback(async () => {
    if (!interviewId) return;

    setStatus('connecting');
    setError(null);

    try {
      //#region Get microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      micStreamRef.current = micStream;
      //#endregion

      //#region WebRTC connection
      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      peer.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream && audioRef.current) audioRef.current.srcObject = remoteStream;
      };

      micStream.getTracks().forEach((track) => peer.addTrack(track, micStream));

      peer.createDataChannel('oai-events').addEventListener('message', (message) => {
        const { type } = JSON.parse(message.data as string) as { type: string };
        if (type.startsWith('output_audio_buffer.')) {
          setInterviewerSpeaking(type === 'output_audio_buffer.started');
        }
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const { sdp } = await createInterviewSession(interviewId, offer.sdp ?? '');
      await peer.setRemoteDescription({ type: 'answer', sdp });

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          endOnDisconnect();
        }
      };
      //#endregion

      stopMicMeterRef.current = startMicMeter(micStream, setCandidateSpeaking);
      setStatus('live');
    } catch (cause) {
      console.error('Failed to join interview room:', cause);
      teardown();
      setStatus('error');
      setError(describeError(cause));
      setOutOfSessions(cause instanceof ApiError && cause.status === 402);
    }
  }, [endOnDisconnect, interviewId, teardown]);
  //#endregion

  const toggleMute = () => {
    const nextMuted = !muted;
    micStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  };

  const statusLine: Record<Status, string> = {
    checking: 'Loading',
    idle: 'Your interviewer is ready when you are.',
    connecting: 'Connecting',
    live: muted ? 'Mic off' : interviewerSpeaking ? 'Interviewer speaking' : 'Listening',
    ended: 'This interview has ended.',
    error: error ?? 'Something went wrong.',
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-ink-foreground">
      <header className="border-b border-ink-border">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-6">
          <Brand />

          <div className="flex items-center gap-5">
            {status !== 'live' && (
              <>
                <Link
                  to="/"
                  className="rounded-md label-mono text-ink-muted outline-none transition-colors hover:text-ink-foreground focus-visible:text-ink-foreground"
                >
                  Home
                </Link>
                <Link
                  to="/interviews"
                  className="rounded-md label-mono text-ink-muted outline-none transition-colors hover:text-ink-foreground focus-visible:text-ink-foreground"
                >
                  Past interviews
                </Link>
              </>
            )}

            <span className="flex items-center gap-2 label-mono text-ink-muted">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  status === 'live' ? 'animate-pulse-dot bg-brand-light' : 'bg-ink-border',
                )}
              />
              {status === 'live' ? 'Live' : 'Interview room'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <audio ref={audioRef} autoPlay className="hidden" />

        <div className="flex items-start gap-14 sm:gap-24">
          <Seat icon={Bot} name="Interviewer" speaking={interviewerSpeaking} />
          <Seat icon={User} name="You" speaking={!muted && candidateSpeaking} muted={muted} />
        </div>

        <p
          className="mt-14 font-display text-xl tracking-[-0.01em] sm:text-2xl"
          role={status === 'error' ? 'alert' : 'status'}
        >
          {statusLine[status]}
        </p>

        <div className="mt-10 flex items-center gap-3">
          {status === 'live' ? (
            <>
              <Button
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                className="h-12 rounded-full border border-ink-border bg-ink-raised px-6 text-ink-foreground hover:bg-ink-border focus-visible:ring-brand-light/40"
              >
                {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {muted ? 'Unmute' : 'Mute'}
              </Button>
              <Button
                type="button"
                onClick={end}
                className="h-12 rounded-full bg-destructive px-6 text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/40"
              >
                <PhoneOff className="size-4" />
                End interview
              </Button>
            </>
          ) : status === 'ended' ? (
            <Button
              asChild
              className="h-12 rounded-full bg-brand px-7 text-[0.9375rem] font-semibold text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand-light/40"
            >
              <Link to={`/interview/${interviewId}/result`} replace>
                <FileText className="size-4" />
                View result
              </Link>
            </Button>
          ) : outOfSessions ? (
            <Button
              asChild
              className="h-12 rounded-full bg-brand px-7 text-[0.9375rem] font-semibold text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand-light/40"
            >
              <Link to="/billing">
                <CreditCard className="size-4" />
                View plans
              </Link>
            </Button>
          ) : status === 'checking' ? null : (
            <Button
              type="button"
              disabled={status === 'connecting'}
              onClick={() => void join()}
              className="h-12 rounded-full bg-brand px-7 text-[0.9375rem] font-semibold text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand-light/40"
            >
              <Mic className="size-4" />
              {status === 'connecting'
                ? 'Connecting'
                : status === 'error'
                  ? 'Try again'
                  : 'Start interview'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

const describeError = (cause: unknown) => {
  if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
    return 'Microphone access is blocked. Allow it in your browser, then try again.';
  }
  if (cause instanceof ApiError) return cause.message;
  return 'Could not start the session. Check your connection and try again.';
};

type SeatProps = {
  icon: LucideIcon;
  name: string;
  speaking: boolean;
  muted?: boolean;
};

function Seat({ icon: Icon, name, speaking, muted = false }: SeatProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      <span
        className={cn(
          'relative grid size-28 place-items-center rounded-full border-2 bg-ink-raised transition-all duration-300 sm:size-32',
          speaking
            ? 'border-brand-light text-brand-light shadow-[0_0_0_8px_hsl(166_62%_58%/0.12)]'
            : 'border-ink-border text-ink-muted',
        )}
      >
        <Icon className="size-10 sm:size-11" strokeWidth={1.5} />
        {muted && (
          <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border border-ink-border bg-ink text-ink-muted">
            <MicOff className="size-4" />
          </span>
        )}
      </span>
      <span
        className={cn(
          'label-mono transition-colors',
          speaking ? 'text-brand-light' : 'text-ink-muted',
        )}
      >
        {name}
      </span>
    </div>
  );
}

export default InterviewRoomPage;
