import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import { createSttGrant } from '@/services/interview.service';
import type { LucideIcon } from 'lucide-react';
import { Bot, Mic, MicOff, PhoneOff, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type Status = 'idle' | 'connecting' | 'live' | 'ended' | 'error';
type Turn = 'interviewer' | 'candidate' | 'silent';

const InterviewRoom = () => {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [turn, setTurn] = useState<Turn>('silent');

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const turnRef = useRef<Turn>('silent');
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const teardown = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;

    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    recorderRef.current = null;

    socketRef.current?.close();
    socketRef.current = null;

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    peerRef.current?.close();
    peerRef.current = null;

    void audioContextRef.current?.close();
    audioContextRef.current = null;
    localAnalyserRef.current = null;
    remoteAnalyserRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }, []);

  const startMeter = useCallback(() => {
    const samples = new Float32Array(
      (localAnalyserRef.current ?? remoteAnalyserRef.current)?.fftSize ?? 0,
    );

    const levelOf = (analyser: AnalyserNode | null) => {
      if (!analyser) return 0;
      analyser.getFloatTimeDomainData(samples);
      let total = 0;
      for (let i = 0; i < samples.length; i += 1) total += samples[i]! * samples[i]!;
      return Math.sqrt(total / samples.length);
    };

    const hold = (previous: number, level: number) =>
      level > previous ? level : previous * 0.9 + level * 0.1;

    let remoteLevel = 0;
    let localLevel = 0;

    const frame = () => {
      remoteLevel = hold(remoteLevel, levelOf(remoteAnalyserRef.current));
      localLevel = hold(localLevel, levelOf(localAnalyserRef.current));

      let next: Turn = 'silent';
      const SPEAKING_THRESHOLD = 0.02;

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

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      const audio = document.createElement('audio');
      audio.autoplay = true;
      audioRef.current = audio;

      const context = new AudioContext();
      audioContextRef.current = context;

      const localAnalyser = context.createAnalyser();
      localAnalyser.fftSize = 1024;
      context.createMediaStreamSource(micStream).connect(localAnalyser);
      localAnalyserRef.current = localAnalyser;

      peer.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;

        audio.srcObject = remoteStream;

        const remoteAnalyser = context.createAnalyser();
        remoteAnalyser.fftSize = 1024;
        context.createMediaStreamSource(remoteStream).connect(remoteAnalyser);
        remoteAnalyserRef.current = remoteAnalyser;
      };

      micStream.getTracks().forEach((track) => peer.addTrack(track, micStream));

      // const offer = await peer.createOffer();
      // await peer.setLocalDescription(offer);

      // const { sdp } = await createSession(interviewId, offer.sdp ?? '');
      // await peer.setRemoteDescription({ type: 'answer', sdp });

      const { access_token } = await createSttGrant(interviewId);
      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?' +
          new URLSearchParams({
            model: 'nova-3',
            language: 'en-US',
            interim_results: 'true',
            punctuate: 'true',
            smart_format: 'true',
            endpointing: '300',
            vad_events: 'true',
          }),
        ['bearer', access_token],
      );
      socketRef.current = socket;

      await new Promise((resolve, reject) => {
        socket.onopen = resolve;
        socket.onerror = () => reject(new Error('Transcription socket failed to open'));
      });

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'Results':
            console.log(
              message.channel.alternatives[0].transcript,
              message.is_final,
              message.speech_final,
            );
            break;

          case 'SpeechStarted':
            console.log('Speech started');
            break;

          case 'UtteranceEnd':
            console.log('Utterance ended');
            break;

          case 'Metadata':
            console.log(message);
            break;
        }
      };

      socket.onerror = (err) => {
        console.error(err);
      };

      socket.onclose = (event) => {
        console.log('Closed', event.code, event.reason);
      };

      const recorder = new MediaRecorder(micStream, { mimeType: 'audio/webm;codecs=opus' });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      };
      // Deepgram drops a socket that goes ~12s without audio, so keep chunks small.
      recorder.start(250);

      setStatus('live');
      startMeter();
    } catch (cause) {
      console.error('Failed to join interview room:', cause);
      teardown();
      setStatus('error');

      if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
        setError('Microphone access is blocked. Allow it in your browser, then try again.');
        return;
      }
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not start the session. Check your connection and try again.',
      );
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
    setStatus('ended');
    setTurn('silent');
    turnRef.current = 'silent';
  };

  useEffect(() => teardown, [teardown]);

  const statusLine: Record<Status, string> = {
    idle: 'Your interviewer is ready when you are.',
    connecting: 'Connecting',
    live: muted ? 'Mic off' : turn === 'interviewer' ? 'Interviewer speaking' : 'Listening',
    ended: 'Interview ended.',
    error: error ?? 'Something went wrong.',
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
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
        ) : status === 'ended' ? (
          <Button
            type="button"
            onClick={() => navigate('/')}
            className="bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
          >
            Back to start
          </Button>
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
  );
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
