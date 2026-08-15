export const sessionConfig = {
  type: 'realtime',
  model: 'gpt-realtime-mini',
  instructions: `You are an AI interviewer conducting a technical interview.`,
  audio: {
    input: {
      turn_detection: {
        type: 'server_vad',
      },
      transcription: {
        model: 'gpt-4o-mini-transcribe',
        language: 'en',
        prompt: 'Technical software engineering interview.',
      },
    },
    output: {
      voice: 'cedar',
    },
  },
};
