import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLibraryGenresInfinite } from '@/hooks/api/library-genres/useLibraryGenresInfinite';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

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
  const isMobile = useIsMobile();
  const location = useLocation();
  const isRoot =
    location.pathname === '/app/library/genres' || location.pathname === '/app/library/genres/';

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

  if (isMobile) {
    if (isRoot) {
      return (
        <div className="flex flex-col gap-4 p-4 pb-40 max-md:pb-[max(10rem,calc(6.5rem+env(safe-area-inset-bottom,0px)))]">
          <PageHeader title="Genres" description={isLoading ? undefined : countsSubtitle} />
          <div className="flex flex-col gap-1">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg bg-accent/50" />
                ))}
              </div>
            ) : (
              genres.map((genre) => (
                <Link
                  key={genre.id}
                  to="/app/library/genres/$genreId"
                  params={{ genreId: genre.id }}
                  className="flex h-14 items-center rounded-xl px-4 text-lg font-medium transition-colors hover:bg-accent/50 active:scale-[0.98]"
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
      );
    }
    return <Outlet />;
  }

  // Desktop Layout — edge-to-edge in the main column; scroll lives in the panes, not the shell
  return (
    <div className="-mx-4 -mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* First Column: Genre List */}
        <div className="flex w-64 shrink-0 flex-col border-r bg-card/50 backdrop-blur-sm">
          <div className="px-4 pb-3 pt-4">
            <h1 className="text-2xl font-bold tracking-tight">Genres</h1>
            {!isLoading && genres.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">{countsSubtitle}</p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-24 custom-scrollbar">
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

        {/* Second Column: Content */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-24 custom-scrollbar">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
