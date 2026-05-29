import { Link, useLocation } from '@tanstack/react-router';
import { HouseIcon, GridFourIcon, BooksIcon, SquaresFourIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';

export function MobileBottomNav() {
  const location = useLocation();
  const { lastSearch } = useSearchPreferencesStore();

  const getPersistentLink = (moduleName: string, rootPath: string) => {
    if (typeof window === 'undefined') return rootPath;
    const lastVisited = sessionStorage.getItem(`last_visited_${moduleName}_route`);

    // Normalize paths for comparison (remove trailing slash)
    const currentPath = location.pathname.replace(/\/$/, '');
    const normalizedRoot = rootPath.replace(/\/$/, '');
    const isAlreadyAtRoot = currentPath === normalizedRoot;

    // If we are currently active in this module, return the root path ONLY if we are NOT already at root
    // This allows clicking the icon to reset to the module root.
    if (location.pathname.startsWith(normalizedRoot) && !isAlreadyAtRoot) {
      return rootPath;
    }

    return lastVisited || rootPath;
  };

  const navItems = [
    {
      to: getPersistentLink('home', '/app'),
      root: '/app',
      icon: <HouseIcon className="size-5" />,
      label: 'Home',
    },
    {
      to: getPersistentLink('new', '/app/new'),
      root: '/app/new',
      icon: <GridFourIcon className="size-5" />,
      label: 'New',
    },
    {
      to: getPersistentLink('overview', '/app/library/overview'),
      root: '/app/library/overview',
      icon: <BooksIcon className="size-5" />,
      label: 'Library',
    },
    {
      to: getPersistentLink('playlists', '/app/playlists'),
      root: '/app/playlists',
      icon: <SquaresFourIcon className="size-5" />,
      label: 'Playlists',
    },
    {
      to: '/app/search',
      root: '/app/search',
      icon: <MagnifyingGlassIcon className="size-5" />,
      label: 'Search',
      search: location.pathname.startsWith('/app/search') && Object.keys(location.search || {}).length > 0
        ? {}
        : lastSearch || {},
    },
  ];

  const isActive = (rootPath: string) => {
    if (rootPath === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(rootPath);
  };

  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-[99999] bg-stone-900/95 backdrop-blur-sm border-t border-white/10 md:hidden"
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            search={item.search}
            data-testid={`nav-item-${item.label.toLowerCase()}`}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors',
              isActive(item.root)
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
