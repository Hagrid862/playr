import { Link, useLocation } from '@tanstack/react-router';
import { HouseIcon, GridFourIcon, BooksIcon, SquaresFourIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  {
    to: '/app',
    icon: <HouseIcon className="size-5" />,
    label: 'Home',
  },
  {
    to: '/app/new',
    icon: <GridFourIcon className="size-5" />,
    label: 'New',
  },
  {
    to: '/app/library/overview',
    icon: <BooksIcon className="size-5" />,
    label: 'Library',
  },
  {
    to: '/app/playlists',
    icon: <SquaresFourIcon className="size-5" />,
    label: 'Playlists',
  },
  {
    to: '/app/search',
    icon: <MagnifyingGlassIcon className="size-5" />,
    label: 'Search',
  },
];

export function MobileBottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[99999] bg-stone-900/95 backdrop-blur-sm border-t border-white/10 md:hidden">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors',
              isActive(item.to)
                ? 'text-primary'
                : 'text-white/70 hover:text-white',
            )}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}