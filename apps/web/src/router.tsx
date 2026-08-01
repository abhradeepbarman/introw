import InterviewResultPage from '@/pages/result';
import NotFoundPage from '@/pages/not-found';
import StartInterviewPage from '@/pages/start-interview';
import { createBrowserRouter } from 'react-router-dom';
import InterviewRoom from './pages/interview-room';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <StartInterviewPage />,
  },
  {
    path: '/interview/:id',
    element: <InterviewRoom />,
  },
  {
    path: '/interview/:id/result',
    element: <InterviewResultPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
