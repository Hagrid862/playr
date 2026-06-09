import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BooksIcon,
  DiscIcon,
  ListBulletsIcon,
  MicrophoneStageIcon,
  MusicNotesIcon,
} from '@phosphor-icons/react';
import { Link, useLocation } from '@tanstack/react-router';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  matchPath: string;
}

const navItems: NavItem[] = [
  {
    to: '/app/library/overview',
    icon: <BooksIcon className="size-4" />,
    label: 'Overview',
    matchPath: '/app/library/overview',
  },
  {
    to: '/app/library/artists',
    icon: <MicrophoneStageIcon className="size-4" />,
    label: 'Artists',
    matchPath: '/app/library/artists',
  },
  {
    to: '/app/library/albums',
    icon: <DiscIcon className="size-4" />,
    label: 'Albums',
    matchPath: '/app/library/albums',
  },
  {
    to: '/app/library/songs',
    icon: <ListBulletsIcon className="size-4" />,
    label: 'Songs',
    matchPath: '/app/library/songs',
  },
  {
    to: '/app/library/genres',
    icon: <MusicNotesIcon className="size-4" />,
    label: 'Genres',
    matchPath: '/app/library/genres',
  },
];

export function LibraryNav() {
  const location = useLocation();

  const isActive = (matchPath: string) => {
    return location.pathname.startsWith(matchPath);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-4 py-2">
      {navItems.map((item) => (
        <Button
          key={item.to}
          variant={isActive(item.matchPath) ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'shrink-0 rounded-lg transition-colors',
            isActive(item.matchPath)
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          asChild
        >
          <Link to={item.to}>
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        </Button>
      ))}
    </div>
  );
}
