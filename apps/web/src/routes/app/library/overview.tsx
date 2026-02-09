import { PageHeader } from '@/components/app/PageHeader';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePrivateProfile, usePrivateProfile } from '@/hooks/api/private-profile';
import { XIcon } from '@phosphor-icons/react';
import { Outlet, createFileRoute, useLocation, useRouter } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/app/library/overview')({
  component: OverviewLayout,
});

function OverviewLayout() {
  const location = useLocation();
  const router = useRouter();
  const [isBannerClosed, setIsBannerClosed] = useState(false);

  const { data: privateProfile, isLoading: isProfileLoading } = usePrivateProfile();
  const { mutate: createProfile, isPending: isCreatingProfile } = useCreatePrivateProfile();

  const showBanner = !isProfileLoading && !privateProfile?.data && !isBannerClosed;

  const isIndex =
    location.pathname === '/app/library/overview' || location.pathname === '/app/library/overview/';
  const isCategoryIndex =
    location.pathname === '/app/library/overview/private' ||
    location.pathname === '/app/library/overview/private/' ||
    location.pathname === '/app/library/overview/community' ||
    location.pathname === '/app/library/overview/community/' ||
    location.pathname === '/app/library/overview/public' ||
    location.pathname === '/app/library/overview/public/';

  const getCategory = () => {
    const segment = location.pathname.split('/').filter(Boolean).pop();
    if (segment === 'private' || segment === 'community' || segment === 'public') {
      return segment;
    }
    return 'all';
  };

  const currentCategory = getCategory();

  const handleContentTypeChange = (contentType: string) => {
    if (contentType === currentCategory) {
      return;
    }

    if (contentType === 'all') {
      router.navigate({
        to: '/app/library/overview',
      });
    } else {
      router.navigate({
        to: `/app/library/overview/${contentType}`,
      });
    }
  };

  const handleCreateProfile = () => {
    createProfile();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title="Overview"
        showBackButton={!isIndex}
        actions={
          isIndex || isCategoryIndex ? (
            <Select value={currentCategory} onValueChange={handleContentTypeChange}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="private">Private Library</SelectItem>
                  <SelectItem value="community">Community Library</SelectItem>
                  <SelectItem value="public">Public Library</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null
        }
      />
      {showBanner && (
        <Alert className="relative bg-primary/5 border-primary/20 overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <AlertTitle className="text-primary font-semibold">Private Profile Missing</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
            <div>
              <div className="text-muted-foreground">
                You haven&apos;t created your private profile yet. Create it now to start building
                your personal library.
              </div>

              <Button
                size="sm"
                onClick={handleCreateProfile}
                disabled={isCreatingProfile}
                className="w-full sm:w-auto"
              >
                {isCreatingProfile ? 'Creating...' : 'Create Private Profile'}
              </Button>
            </div>
          </AlertDescription>
          <AlertAction>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 hover:bg-primary/10"
              onClick={() => setIsBannerClosed(true)}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </AlertAction>
        </Alert>
      )}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
