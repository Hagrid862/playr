import { PageHeader } from '@/components/app/PageHeader';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Outlet, createFileRoute, useLocation, useRouter } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/overview')({
  component: OverviewLayout,
});

function OverviewLayout() {
  const location = useLocation();
  const router = useRouter();

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
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
