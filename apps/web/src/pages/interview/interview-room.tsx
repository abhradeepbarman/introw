import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import { createSession } from '@/services/interview.service';
import type { LucideIcon } from 'lucide-react';
import { Bot, Mic, MicOff, PhoneOff, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type Status = 'idle' | 'connecting' | 'live' | 'error';
type Turn = 'interviewer' | 'candidate' | 'silent';

const FFT_SIZE = 1024;
const SPEAKING_THRESHOLD = 0.02;
const PRIMARY_BUTTON =
  'bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40';

const analyserFor = (context: AudioContext, stream: MediaStream) => {
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  context.createMediaStreamSource(stream).connect(analyser);
  return analyser;
};

const InterviewRoom = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [turn, setTurn] = useState<Turn>('silent');

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const turnRef = useRef<Turn>('silent');

  const teardown = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    peerRef.current?.close();
    peerRef.current = null;

    void audioContextRef.current?.close();
    audioContextRef.current = null;
    localAnalyserRef.current = null;
    remoteAnalyserRef.current = null;

    if (audioRef.current) audioRef.current.srcObject = null;
  }, []);

  const startMeter = useCallback(() => {
    const samples = new Float32Array(FFT_SIZE);

    const levelOf = (analyser: AnalyserNode | null) => {
      if (!analyser) return 0;
      analyser.getFloatTimeDomainData(samples);
      let total = 0;
      for (let i = 0; i < samples.length; i += 1) total += samples[i]! * samples[i]!;
      return Math.sqrt(total / samples.length);
    };

    // rise instantly, decay slowly, so the indicator doesn't flicker between syllables
    const hold = (previous: number, level: number) =>
      level > previous ? level : previous * 0.9 + level * 0.1;

    let remoteLevel = 0;
    let localLevel = 0;

    const frame = () => {
      remoteLevel = hold(remoteLevel, levelOf(remoteAnalyserRef.current));
      localLevel = hold(localLevel, levelOf(localAnalyserRef.current));

      let next: Turn = 'silent';
      if (Math.max(remoteLevel, localLevel) > SPEAKING_THRESHOLD) {
        next = remoteLevel >= localLevel ? 'interviewer' : 'candidate';
      }

      if (next !== turnRef.current) {
        turnRef.current = next;
        setTurn(next);
      }

      frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
  }, []);

  const join = useCallback(async () => {
    if (!interviewId) return;

    setStatus('connecting');
    setError(null);

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const context = new AudioContext();
      audioContextRef.current = context;
      localAnalyserRef.current = analyserFor(context, micStream);

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      peer.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream || !audioRef.current) return;

        audioRef.current.srcObject = remoteStream;
        remoteAnalyserRef.current = analyserFor(context, remoteStream);
      };

      micStream.getTracks().forEach((track) => peer.addTrack(track, micStream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const { sdp } = await createSession(interviewId, offer.sdp ?? '');
      await peer.setRemoteDescription({ type: 'answer', sdp });

      setStatus('live');
      startMeter();
    } catch (cause) {
      console.error('Failed to join interview room:', cause);
      teardown();
      setStatus('error');
      setError(describeError(cause));
    }
  }, [interviewId, startMeter, teardown]);

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
    live: muted ? 'Mic off' : turn === 'interviewer' ? 'Interviewer speaking' : 'Listening',
    error: error ?? 'Something went wrong.',
  };

  const renderControls = () => {
    if (status === 'live') {
      return (
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
      );
    }

    return (
      <Button
        type="button"
        disabled={status === 'connecting'}
        onClick={() => void join()}
        className={PRIMARY_BUTTON}
      >
        <Mic className="size-4" />
        {status === 'connecting'
          ? 'Connecting'
          : status === 'error'
            ? 'Try again'
            : 'Start interview'}
      </Button>
    );
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <audio ref={audioRef} autoPlay className="hidden" />

      <div className="flex items-center gap-12 sm:gap-20">
        <Seat icon={Bot} name="Interviewer" speaking={turn === 'interviewer'} />
        <Seat icon={User} name="You" speaking={turn === 'candidate'} muted={muted} />
      </div>

      <p
        className="mt-12 text-sm text-muted-foreground"
        role={status === 'error' ? 'alert' : 'status'}
      >
        {statusLine[status]}
      </p>

      <div className="mt-8 flex items-center gap-3">{renderControls()}</div>
    </main>
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
