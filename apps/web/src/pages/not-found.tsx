import { AppHeader } from '@/components/common/app-header';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <>
      <AppHeader eyebrow="Not found" />

      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center px-6">
        <div className="text-center">
          <p className="label-mono text-muted-foreground">404</p>
          <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.03em]">
            There is no page at this address.
          </h1>
          <Button
            asChild
            className="mt-8 h-12 rounded-lg bg-brand px-6 font-semibold text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
          >
            <Link to="/">Back to session setup</Link>
          </Button>
        </div>
      </main>
    </>
  );
};

export default NotFoundPage;
