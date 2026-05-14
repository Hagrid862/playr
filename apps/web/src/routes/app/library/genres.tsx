import { PageHeader } from '@/components/app/PageHeader';
import { useLibraryGenres } from '@/hooks/api/library-genres/useLibraryGenres';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import { motion } from 'framer-motion';

export const Route = createFileRoute('/app/library/genres')({
  component: GenresLayout,
});

function GenresLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isRoot =
    location.pathname === '/app/library/genres' || location.pathname === '/app/library/genres/';

  const { data: genresData, isLoading } = useLibraryGenres({ page: 1, limit: 100 });
  const genres = genresData?.data?.items ?? [];

  if (isMobile) {
    if (isRoot) {
      return (
        <div className="flex flex-col gap-4 p-4 pb-32">
          <PageHeader title="Genres" />
          <div className="flex flex-col gap-1">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-accent/50" />
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
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-24 custom-scrollbar">
            <div className="flex flex-col gap-1">
              {isLoading ? (
                <div className="flex flex-col gap-2 px-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-accent/50" />
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
