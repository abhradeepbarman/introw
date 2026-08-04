import { AppHeader } from '@/components/common/app-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import { createInterviewSession } from '@/services/interview.service';
import type { LucideIcon } from 'lucide-react';
import { Bot, Mic, MicOff, PhoneOff, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type Status = 'idle' | 'connecting' | 'live' | 'error';

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

const InterviewRoom = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const stopMicMeterRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const teardown = useCallback(() => {
    stopMicMeterRef.current?.();
    stopMicMeterRef.current = null;

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    peerRef.current?.close();
    peerRef.current = null;

    if (audioRef.current) audioRef.current.srcObject = null;
  }, []);

  const join = useCallback(async () => {
    if (!interviewId) return;

    setStatus('connecting');
    setError(null);

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      micStreamRef.current = micStream;

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

      stopMicMeterRef.current = startMicMeter(micStream, setCandidateSpeaking);
      setStatus('live');
    } catch (cause) {
      console.error('Failed to join interview room:', cause);
      teardown();
      setStatus('error');
      setError(describeError(cause));
    }
  }, [interviewId, teardown]);

  const toggleMute = () => {
    const nextMuted = !muted;
    micStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  };

  const end = () => {
    teardown();
    navigate(`/interview/${interviewId}/result`);
  };

  useEffect(() => teardown, [teardown]);

  const statusLine: Record<Status, string> = {
    idle: 'Your interviewer is ready when you are.',
    connecting: 'Connecting',
    live: muted ? 'Mic off' : interviewerSpeaking ? 'Interviewer speaking' : 'Listening',
    error: error ?? 'Something went wrong.',
  };

  return (
    <>
      <AppHeader brandTo={null} eyebrow="Interview room" />

      <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-6 text-center">
        <audio ref={audioRef} autoPlay className="hidden" />

        <div className="flex items-center gap-12 sm:gap-20">
          <Seat icon={Bot} name="Interviewer" speaking={interviewerSpeaking} />
          <Seat icon={User} name="You" speaking={!muted && candidateSpeaking} muted={muted} />
        </div>

        <p
          className="mt-12 text-sm text-muted-foreground"
          role={status === 'error' ? 'alert' : 'status'}
        >
          {statusLine[status]}
        </p>

        <div className="mt-8 flex items-center gap-3">
          {status === 'live' ? (
            <>
              <Button type="button" variant="outline" onClick={toggleMute} aria-pressed={muted}>
                {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {muted ? 'Unmute' : 'Mute'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={end}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <PhoneOff className="size-4" />
                End interview
              </Button>
            </>
          ) : (
            <Button
              type="button"
              disabled={status === 'connecting'}
              onClick={() => void join()}
              className="bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
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
    </>
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
    <div className="flex flex-col items-center gap-4">
      <span
        className={cn(
          'relative flex size-24 items-center justify-center rounded-full border-2 transition-colors duration-200',
          speaking ? 'border-brand text-brand' : 'border-border text-muted-foreground',
        )}
      >
        <Icon className="size-9" strokeWidth={1.5} />
        {muted && (
          <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
            <MicOff className="size-3.5" />
          </span>
        )}
      </span>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
        {name}
      </span>
    </div>
  );
}

export default InterviewRoom;
