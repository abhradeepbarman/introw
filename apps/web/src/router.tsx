import { GuestRoute, ProtectedRoute } from '@/components/common/route-guards';
import { AuthProvider } from '@/contexts/auth-context';
import ForgotPasswordPage from '@/pages/auth/forgot-password';
import GoogleCallbackPage from '@/pages/auth/google-callback';
import LoginPage from '@/pages/auth/login';
import RegisterPage from '@/pages/auth/register';
import ResetPasswordPage from '@/pages/auth/reset-password';
import BillingPage from '@/pages/account/billing';
import InterviewHistoryPage from '@/pages/account/history';
import InterviewResultPage from '@/pages/interview/result';
import InterviewRoomPage from '@/pages/interview/room';
import StartInterviewPage from '@/pages/interview/start';
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
          { path: '/billing', element: <BillingPage /> },
          { path: '/interviews', element: <InterviewHistoryPage /> },
          { path: '/interview/:id', element: <InterviewRoomPage /> },
          { path: '/interview/:id/result', element: <InterviewResultPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
