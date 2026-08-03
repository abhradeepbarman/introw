import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <>
      <AppHeader eyebrow="Not found" />

      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center px-6">
        <div className="text-center">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
            404
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em]">
            There is no page at this address.
          </h1>
          <Button
            asChild
            className="mt-8 bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
          >
            <Link to="/">Back to session setup</Link>
          </Button>
        </div>
      </main>
    </>
  );
};

export default NotFoundPage;
