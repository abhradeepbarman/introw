import { useAuth } from '@/context/auth-context';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleCallbackPage = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    refreshUser().finally(() => navigate('/', { replace: true }));
  }, [refreshUser, navigate]);

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
