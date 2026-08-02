import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Coins } from 'lucide-react';
import { Link } from 'react-router-dom';

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

function CreditsBadge({ credits }: { credits: number }) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-border bg-brand-wash px-2.5 py-1 font-mono text-[0.6875rem] tabular-nums text-brand"
      title={`${credits} interview ${credits === 1 ? 'credit' : 'credits'} remaining`}
    >
      <Coins className="size-3.5" />
      {credits}
    </span>
  );
}

export function UserNav() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
        <Button
          asChild
          size="sm"
          className="bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/40"
        >
          <Link to="/register">Sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <CreditsBadge credits={user.credits} />

      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-brand font-mono text-[0.6875rem] font-medium text-brand-foreground"
        >
          {initialsOf(user.name)}
        </span>
        <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={logout}>
        Sign out
      </Button>
    </div>
  );
}
