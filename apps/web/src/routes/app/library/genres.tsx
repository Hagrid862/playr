import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLibraryGenresInfinite } from '@/hooks/api/library-genres/useLibraryGenresInfinite';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { CompactSearch } from '@/components/search/CompactSearch';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';
import { SubHeader } from '@/components/app/SubHeader';

export const Route = createFileRoute('/app/library/genres')({
  component: GenresLayout,
});

const GENRE_LIST_PAGE_SIZE = 50;

function formatLoadedOfTotal(loaded: number, total: number | undefined, pluralNoun: string) {
  if (total == null) return `${loaded} ${pluralNoun}`;
  if (loaded >= total) return `${total} ${pluralNoun}`;
  return `${loaded} of ${total} ${pluralNoun}`;
}

function GenresLayout() {
  usePersistentNavigation('genres', '/app/library/genres');
  const isMobile = useIsMobile();
  const location = useLocation();

  const genresQuery = useLibraryGenresInfinite({ limit: GENRE_LIST_PAGE_SIZE });

  const genres = useMemo(() => {
    const pages = genresQuery.data?.pages;
    if (!pages?.length) return [];
    return pages.flatMap((page) => page.data?.items ?? []);
  }, [genresQuery.data]);

  const genresTotal = genresQuery.data?.pages[0]?.data?.total;
  const countsSubtitle = useMemo(
    () => formatLoadedOfTotal(genres.length, genresTotal, 'genres'),
    [genres.length, genresTotal],
  );

  const isLoading = genresQuery.isPending;
  const genresHasMore = genresQuery.hasNextPage === true;

  // Mobile: SubHeader + content
  if (isMobile) {
    return (
      <div className="flex flex-col h-full w-full">
        <SubHeader
          title="Genres"
          search={<CompactSearch category="genre" />}
          showBackButton={true}
        />
        <div className="flex-1 overflow-y-auto p-4 pb-40 max-md:pb-[max(10rem,calc(6.5rem+env(safe-area-inset-bottom,0px)))]">
          <Outlet />
        </div>
      </div>
    );
  }

  // Desktop: SubHeader + sidebar (genre list) + content area
  return (
    <div className="flex flex-col h-full w-full">
      <SubHeader title="Genres" search={<CompactSearch category="genre" />} showBackButton={true} />
      <div className="flex min-h-0 flex-1 overflow-hidden items-stretch w-full max-w-full">
        <div className="flex w-64 shrink-0 flex-col border-r bg-card/50 backdrop-blur-sm h-full min-h-full">
          <div className="px-4 pb-3 pt-4 flex flex-col gap-2 shrink-0">
            <p className="text-xs text-muted-foreground">{countsSubtitle}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-24 custom-scrollbar h-full">
            <div className="flex flex-col gap-1">
              {isLoading ? (
                <div className="flex flex-col gap-2 px-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg bg-accent/50" />
                  ))}
                </div>
              ) : (
                genres.map((genre) => (
                  <Link
                    key={genre.id}
                    to="/app/library/genres/$genreId"
                    params={{ genreId: genre.id }}
                    activeOptions={{ exact: true }}
                    activeProps={{ className: 'bg-primary text-primary-foreground shadow-sm' }}
                    inactiveProps={{
                      className: 'hover:bg-accent/50 text-muted-foreground hover:text-foreground',
                    }}
                    className={cn(
                      'flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-all',
                    )}
                  >
                    {genre.name}
                  </Link>
                ))
              )}
              {genres.length > 0 && genresHasMore ? (
                <div className="flex justify-center py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => genresQuery.fetchNextPage()}
                    disabled={genresQuery.isFetchingNextPage}
                    className="text-xs"
                  >
                    {genresQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-24 custom-scrollbar h-full w-full">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
