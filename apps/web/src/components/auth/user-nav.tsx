import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/auth-context';
import { ChevronDown, Coins, History, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

function CreditsBadge({ credits }: { credits: number }) {
  return (
    <Link
      to="/credits"
      title={`${credits} interview ${credits === 1 ? 'credit' : 'credits'} remaining`}
      className="hidden items-center gap-1.5 rounded-full border border-border bg-brand-wash px-2.5 py-1 font-mono text-[0.6875rem] tabular-nums text-brand outline-none transition-colors hover:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/40 sm:flex"
    >
      <Coins className="size-3.5" />
      {credits}
    </Link>
  );
}

export function UserNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex items-center gap-3">
      <CreditsBadge credits={user.credits} />

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40 data-[state=open]:bg-muted"
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-brand font-mono text-[0.6875rem] font-medium text-brand-foreground"
          >
            {initialsOf(user.name)}
          </span>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
            {user.name}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuLabel>
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to="/interviews">
              <History />
              Past interviews
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/credits">
              <Coins />
              Credits
              <span className="ml-auto font-mono text-[0.6875rem] tabular-nums text-brand">
                {user.credits}
              </span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
