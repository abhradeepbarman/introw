import WebSocket from 'ws';
import envConfig from '../config/env';

export const initSideband = async (callId: string, interviewId: string) => {
  const url = 'wss://api.openai.com/v1/realtime?call_id=' + callId;
  const ws = new WebSocket(url, {
    headers: {
      Authorization: 'Bearer ' + envConfig.OPENAI_API_KEY,
    },
  });

  ws.on('open', function open() {
    console.log('Connected to server.');

    // Send client events over the WebSocket once connected
    ws.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions:
            "You are an AI interviewer conducting a technical interview. Your task is to ask the candidate questions related to programming, algorithms, and data structures. You should evaluate the candidate's responses and provide feedback. Keep the conversation professional and focused on assessing the candidate's technical skills. Ask follow-up questions based on the candidate's answers to gauge their depth of understanding. Avoid asking personal questions or discussing topics unrelated to the interview.",
        },
      }),
    );
  });

  ws.on('message', function incoming(message) {
    const parsedMessage = JSON.parse(message.toString());
    console.log('Received message from server:', parsedMessage);
  });
};
