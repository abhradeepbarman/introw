import NotFoundPage from '@/pages/not-found';
import StartInterviewPage from '@/pages/start-interview';
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <StartInterviewPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
