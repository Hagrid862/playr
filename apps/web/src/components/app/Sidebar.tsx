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
import { LibraryStorageUsageBar } from '@/components/app/LibraryStorageUsageBar';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';

export function AppSidebar() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const navigate = useNavigate();
  const { mutateAsync: logoutHook, isPending: logoutIsLoading } = useLogout();
  const { data: pinsResponse } = useLibraryPlaylistPins();
  const pins = pinsResponse?.data ?? [];

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

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to="/app/search"
                    activeOptions={{ exact: false }}
                    activeProps={{ 'data-active': 'true' }}
                  >
                    <MagnifyingGlassIcon />
                    <span>Search</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to="/app"
                    activeOptions={{ exact: true }}
                    activeProps={{ 'data-active': 'true' }}
                  >
                    <HouseIcon />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/app/new" activeProps={{ 'data-active': 'true' }}>
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
                  <Link to="/app/library/overview" activeProps={{ 'data-active': 'true' }}>
                    <BooksIcon />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/app/library/artists" activeProps={{ 'data-active': 'true' }}>
                    <MicrophoneStageIcon />
                    <span>Artists</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/app/library/albums" activeProps={{ 'data-active': 'true' }}>
                    <DiscIcon />
                    <span>Albums</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/app/library/songs" activeProps={{ 'data-active': 'true' }}>
                    <ListBulletsIcon />
                    <span>Songs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/app/library/genres" activeProps={{ 'data-active': 'true' }}>
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
                    to="/app/playlists"
                    activeOptions={{ exact: true }}
                    activeProps={{ 'data-active': 'true' }}
                  >
                    <SquaresFourIcon />
                    <span>All Playlists</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {pins.map((pin) => (
                <SidebarMenuItem key={pin.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: pin.playlist.name, sideOffset: 10 }}
                  >
                    <Link
                      to="/app/playlists/$playlistId"
                      params={{ playlistId: pin.playlist.id }}
                      activeProps={{ 'data-active': 'true' }}
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
        <LibraryStorageUsageBar className="group-data-[collapsible=icon]:hidden" />
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
