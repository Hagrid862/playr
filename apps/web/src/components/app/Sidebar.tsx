import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from '../ui/sidebar';
import { Spinner } from '../ui/spinner';
import { useAuthStore } from '@/stores/auth.store';
import {
  BooksIcon,
  DiscIcon,
  GridFourIcon,
  HouseIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  MicrophoneStageIcon,
  MusicNotesIcon,
  PlaylistIcon,
  SignOutIcon,
  SquaresFourIcon,
  StarIcon,
} from '@phosphor-icons/react';
import { PlaylistSystemRole } from '@repo/db';
import { useLibraryPlaylistPins } from '@/hooks/api/library-playlists/useLibraryPlaylistPins';
import { useLogout } from '@/hooks/api/auth/useLogout';
import { Link, useNavigate, useRouter, useLocation } from '@tanstack/react-router';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import type { LibraryPlaylistPinRowSchema } from '@repo/contracts';
import { z } from 'zod';
import { useMediaQuery } from '@/hooks/use-media-query';

type LibraryPlaylistPinRow = z.infer<typeof LibraryPlaylistPinRowSchema>;

// Large screen breakpoint - sidebar can be expanded/collapsed
const LARGE_BREAKPOINT = '(min-width: 1200px)';

export function AppSidebar() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const navigate = useNavigate();
  const location = useLocation();
  const { mutateAsync: logoutHook, isPending: logoutIsLoading } = useLogout();
  const { data: pinsResponse } = useLibraryPlaylistPins();
  const pins = pinsResponse?.data ?? [];
  const { lastSearch } = useSearchPreferencesStore();
  const isLargeScreen = useMediaQuery(LARGE_BREAKPOINT);

  const handleLogout = async () => {
    try {
      await logoutHook({});
    } catch (err) {
      console.error('Failed to log out', err);
    } finally {
      logout();
      await router.invalidate();
      await navigate({ to: '/auth/login' });
    }
  };

  const getPersistentLink = (moduleName: string, rootPath: string) => {
    if (typeof window === 'undefined') return rootPath;
    const lastVisited = sessionStorage.getItem(`last_visited_${moduleName}_route`);
    
    // Normalize paths for comparison (remove trailing slash)
    const currentPath = location.pathname.replace(/\/$/, '');
    const normalizedRoot = rootPath.replace(/\/$/, '');
    const isAlreadyAtRoot = currentPath === normalizedRoot;
    
    // If we are currently active in this module, return the root path to allow resetting
    if (location.pathname.startsWith(normalizedRoot) && !isAlreadyAtRoot) {
      return rootPath;
    }
    
    return lastVisited || rootPath;
  };

  const isModuleActive = (rootPath: string) => {
    if (rootPath === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(rootPath);
  };

  const getLinkClassName = (rootPath: string) =>
    isModuleActive(rootPath)
      ? 'bg-accent text-primary'
      : 'text-white hover:text-primary';

  // Sidebar always uses 'icon' collapsible mode.
  // On large screens (>=1200px), the SidebarProvider allows toggling via SidebarTrigger.
  // On medium screens (641-1199px), the SidebarProvider forces open=false, locking it collapsed.
  // On mobile (≤640px), the AppSidebar is not rendered at all.
  const collapsible = 'icon' as const;

  return (
    <Sidebar collapsible={collapsible} variant="floating">
      <SidebarHeader>
        {isLargeScreen && <SidebarTrigger />}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to="/app/search"
                    search={
                      location.pathname.startsWith('/app/search') &&
                      Object.keys(location.search).length > 0
                        ? {}
                        : lastSearch || {}
                    }
                    activeOptions={{ exact: false }}
                    activeProps={{ className: 'bg-accent text-primary' }}
                    className={getLinkClassName('/app/search')}
                  >
                    <MagnifyingGlassIcon />
                    <span>Search</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={getPersistentLink('home', '/app')}
                    activeOptions={{ exact: true }}
                    activeProps={{ className: 'bg-accent text-primary' }}
                    className={getLinkClassName('/app')}
                  >
                    <HouseIcon />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={getPersistentLink('new', '/app/new')}
                    activeOptions={{ exact: true }}
                    activeProps={{ className: 'bg-accent text-primary' }}
                    className={getLinkClassName('/app/new')}
                  >
                    <GridFourIcon />
                    <span>New</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={getPersistentLink('overview', '/app/library/overview')}
                    activeOptions={{ exact: false }}
                    className={getLinkClassName('/app/library/overview')}
                  >
                    <BooksIcon />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={getPersistentLink('artists', '/app/library/artists')}
                    activeOptions={{ exact: false }}
                    className={getLinkClassName('/app/library/artists')}
                  >
                    <MicrophoneStageIcon />
                    <span>Artists</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={getPersistentLink('albums', '/app/library/albums')}
                    activeOptions={{ exact: false }}
                    className={getLinkClassName('/app/library/albums')}
                  >
                    <DiscIcon />
                    <span>Albums</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={getPersistentLink('songs', '/app/library/songs')}
                    activeOptions={{ exact: false }}
                    className={getLinkClassName('/app/library/songs')}
                  >
                    <ListBulletsIcon />
                    <span>Songs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={getPersistentLink('genres', '/app/library/genres')}
                    activeOptions={{ exact: false }}
                    className={getLinkClassName('/app/library/genres')}
                  >
                    <MusicNotesIcon />
                    <span>Genres</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Playlists</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={getPersistentLink('playlists', '/app/playlists')}
                    activeOptions={{ exact: true }}
                    activeProps={{ className: 'bg-accent text-primary' }}
                    className={getLinkClassName('/app/playlists')}
                  >
                    <SquaresFourIcon />
                    <span>All Playlists</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {pins.map((pin: LibraryPlaylistPinRow) => (
                <SidebarMenuItem key={pin.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: pin.playlist.name, sideOffset: 10 }}
                  >
                    <Link
                      to="/app/playlists/$playlistId"
                      params={{ playlistId: pin.playlist.id }}
                      activeProps={{ className: 'bg-accent text-primary' }}
                      className="text-white hover:text-primary"
                    >
                      <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-800">
                        {pin.playlist.systemRole === PlaylistSystemRole.favorites ? (
                          <StarIcon className="text-muted-foreground" />
                        ) : pin.playlist.cover?.url ? (
                          <img
                            src={pin.playlist.cover.url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <PlaylistIcon className="text-muted-foreground" />
                        )}
                      </span>
                      <span className="truncate">{pin.playlist.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} disabled={logoutIsLoading}>
              {logoutIsLoading && <Spinner className="mr-2" />}
              <SignOutIcon />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
