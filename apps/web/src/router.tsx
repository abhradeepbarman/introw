import { GuestRoute, ProtectedRoute } from '@/components/auth/route-guards';
import { AuthProvider } from '@/context/auth-context';
import ForgotPasswordPage from '@/pages/auth/forgot-password';
import GoogleCallbackPage from '@/pages/auth/google-callback';
import LoginPage from '@/pages/auth/login';
import RegisterPage from '@/pages/auth/register';
import ResetPasswordPage from '@/pages/auth/reset-password';
import CreditsPage from '@/pages/credits';
import InterviewHistoryPage from '@/pages/interview/history';
import InterviewRoom from '@/pages/interview/interview-room';
import InterviewResultPage from '@/pages/interview/result';
import StartInterviewPage from '@/pages/interview/start-interview';
import NotFoundPage from '@/pages/not-found';
import { createBrowserRouter, Outlet } from 'react-router-dom';

const RootLayout = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <StartInterviewPage /> },
      { path: '/auth/google-callback', element: <GoogleCallbackPage /> },
      {
        element: <GuestRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password/:token', element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/interviews', element: <InterviewHistoryPage /> },
          { path: '/credits', element: <CreditsPage /> },
          { path: '/interview/:id', element: <InterviewRoom /> },
          { path: '/interview/:id/result', element: <InterviewResultPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
