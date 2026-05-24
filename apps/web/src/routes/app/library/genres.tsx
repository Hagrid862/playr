import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLibraryGenresInfinite } from '@/hooks/api/library-genres/useLibraryGenresInfinite';
import { useLibrarySearch } from '@/hooks/api/search/useLibrarySearch';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { SearchInput } from '@/components/search/SearchInput';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { type LibrarySearchQuery, type LibrarySearchResultsData } from '@repo/contracts';

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

  const [sidebarQuery, setSidebarQuery] = useState('');
  const [searchParams, setSearchParams] = useState<LibrarySearchQuery>({
    query: '',
    filters: {
      categories: ['genre'],
      visibility: 'private',
    },
    page: 1,
    pageSize: 50,
  });

  const genresQuery = useLibraryGenresInfinite({ limit: GENRE_LIST_PAGE_SIZE });
  const { data: searchResponse, isLoading: isSearchLoading } = useLibrarySearch(searchParams, {
    enabled: !!sidebarQuery && sidebarQuery.length >= 3,
  });

  const searchData = (searchResponse as LibrarySearchResultsData | undefined)?.data;
  const isSearchActive = sidebarQuery.length >= 3;

  const genres = useMemo(() => {
    const pages = genresQuery.data?.pages;
    if (!pages?.length) return [];
    return pages.flatMap((page) => page.data?.items ?? []);
  }, [genresQuery.data]);

  const searchResults = useMemo(() => {
    return searchData?.results || [];
  }, [searchData]);

  const genresTotal = genresQuery.data?.pages[0]?.data?.total;
  const countsSubtitle = useMemo(
    () => formatLoadedOfTotal(genres.length, genresTotal, 'genres'),
    [genres.length, genresTotal],
  );

  const isLoading = genresQuery.isPending;
  const genresHasMore = genresQuery.hasNextPage === true;

  const handleSearch = (query: string) => {
    setSidebarQuery(query);
    setSearchParams((prev) => ({
      ...prev,
      query,
      page: 1,
    }));
  };

  if (isMobile) {
    if (isRoot) {
      return (
        <div className="flex flex-col gap-4 p-4 pb-40 max-md:pb-[max(10rem,calc(6.5rem+env(safe-area-inset-bottom,0px)))]">
          <div className="flex flex-col gap-1">
            <Outlet />
          </div>
        </div>
      );
    }
    return <Outlet />;
  }

  return (
    <div className="-mx-4 -mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* First Column: Genre List */}
        <div className="flex w-64 shrink-0 flex-col border-r bg-card/50 backdrop-blur-sm">
          <div className="px-4 pb-3 pt-4 space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Genres</h1>
              {!isLoading && genres.length > 0 && !isSearchActive ? (
                <p className="mt-1 text-xs text-muted-foreground">{countsSubtitle}</p>
              ) : null}
            </div>

            <SearchInput
              simple
              size="sm"
              lockedCategory="genre"
              placeholder="Search genres..."
              initialValue={sidebarQuery}
              onSearch={handleSearch}
              className="w-full"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-24 custom-scrollbar">
            <div className="flex flex-col gap-1">
              {isLoading || isSearchLoading ? (
                <div className="flex flex-col gap-2 px-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg bg-accent/50" />
                  ))}
                </div>
              ) : isSearchActive ? (
                searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <Link
                      key={result.id}
                      to="/app/library/genres/$genreId"
                      params={{ genreId: result.id }}
                      activeOptions={{ exact: true }}
                      activeProps={{ className: 'bg-primary text-primary-foreground shadow-sm' }}
                      inactiveProps={{
                        className: 'hover:bg-accent/50 text-muted-foreground hover:text-foreground',
                      }}
                      className="flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-all"
                    >
                      {result.name}
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No matching genres
                  </div>
                )
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

              {genres.length > 0 && genresHasMore && !isSearchActive ? (
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
