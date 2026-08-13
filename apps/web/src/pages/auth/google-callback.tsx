import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleCallbackPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate(user ? '/' : '/login?error=Google+sign-in+failed.+Please+try+again.', {
      replace: true,
    });
  }, [user, isLoading, navigate]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <p
        className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground"
        role="status"
      >
        Finishing sign-in
      </p>
    </main>
  );
};

export default GoogleCallbackPage;
