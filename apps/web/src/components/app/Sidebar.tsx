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
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/auth.store';
import {
  BooksIcon,
  CircleNotchIcon,
  DiscIcon,
  GridFourIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  MicrophoneStageIcon,
  SignOutIcon,
} from '@phosphor-icons/react';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useLogout } from '@/hooks/api/auth/useLogout';

export function AppSidebar() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const navigate = useNavigate();
  const { mutateAsync: logoutHook, isPending: logoutIsLoading } = useLogout();

  const handleLogout = async () => {
    try {
      await logoutHook({});
    } catch (err) {
      console.error('Failed to log out', err);
      return;
    }

    logout();
    await router.invalidate();
    await navigate({ to: '/auth/login' });
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
                  <Link to="/app/search" activeProps={{ 'data-active': 'true' }}>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} disabled={logoutIsLoading}>
              {logoutIsLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
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
