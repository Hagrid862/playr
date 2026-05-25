import { SubHeader } from '@/components/app/SubHeader';
import { Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import { CompactSearch } from '@/components/search/CompactSearch.tsx';

export const Route = createFileRoute('/app/library/songs')({
  component: SongsLayout,
});

function SongsLayout() {
  const location = useLocation();
  const isIndex =
    location.pathname === '/app/library/songs' || location.pathname === '/app/library/songs/';

  const title = 'Songs';

  return (
    <div className="flex flex-col h-full w-full">
      <SubHeader
        title={title}
        search={<CompactSearch category="track" />}
        showBackButton={!isIndex}
      />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
