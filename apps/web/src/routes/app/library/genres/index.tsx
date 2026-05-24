import { Spinner } from '@/components/ui/spinner';
import { useLibraryGenres } from '@/hooks/api/library-genres/useLibraryGenres';
import { FunnelIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchCategoryFilters } from '@/components/search/SearchCategoryFilters';
import { SearchFilters } from '@/components/search/SearchFilters';
import { useLibrarySearch } from '@/hooks/api/search/useLibrarySearch';
import { SearchResults } from '@/components/search/SearchResults';
import { Button } from '@/components/ui/button';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type LibrarySearchQuery,
  type LibrarySearchResultsData,
  type SearchCategory,
} from '@repo/contracts';
import { PageHeader } from '@/components/app/PageHeader';
import { MediaCard } from '@/components/library/MediaCard';

export const Route = createFileRoute('/app/library/genres/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: genresResponse, isLoading: isInitialLoading } = useLibraryGenres({
    page: 1,
    limit: 100,
  });
  const genres = genresResponse?.data?.items || [];
  const { viewType } = useSearchPreferencesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<LibrarySearchQuery>({
    query: '',
    filters: {
      categories: ['genre'],
      visibility: 'private',
    },
    page: 1,
    pageSize: 20,
  });

  const {
    data: searchResponse,
    isLoading: isSearchLoading,
    error: searchError,
  } = useLibrarySearch(searchParams, {
    enabled: !!searchQuery && searchQuery.length >= 3,
  });

  const searchData = searchResponse?.data as LibrarySearchResultsData | undefined;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSearchParams((prev) => ({
      ...prev,
      query,
      page: 1,
    }));
  };

  const handleFilterNavigate = (params: {
    search: (prev: LibrarySearchQuery) => LibrarySearchQuery;
  }) => {
    setSearchParams((prev) => params.search(prev));
  };

  const renderContent = () => {
    if (searchQuery && searchQuery.length >= 3) {
      if (isSearchLoading) {
        return (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 bg-stone-900/50 rounded-2xl">
                <Skeleton className="w-full aspect-square rounded-xl bg-stone-800" />
                <Skeleton className="h-4 w-2/3 mx-auto bg-stone-800" />
              </div>
            ))}
          </div>
        );
      }

      if (searchError) {
        return (
          <div className="p-8 text-center border border-white/5 rounded-2xl bg-stone-900/20">
            <p className="text-destructive font-medium">Failed to load search results</p>
            <p className="text-sm text-muted-foreground mt-1">{searchError.message}</p>
          </div>
        );
      }

      return <SearchResults data={searchData} viewType={viewType} isLibrarySearch={true} />;
    }

    if (isInitialLoading) {
      return (
        <div className="flex h-100 flex-col items-center justify-center gap-4">
          <Spinner className="size-8 text-primary" />
          <p className="text-muted-foreground animate-pulse">Fetching your genres...</p>
        </div>
      );
    }

    if (genres.length === 0) {
      return (
        <div className="flex min-h-100 flex-col items-center justify-center rounded-2xl p-12 text-center backdrop-blur-sm">
          <div className="mb-6 rounded-full bg-stone-800/50 p-6 ring-1 ring-white/5">
            <MagnifyingGlassIcon className="size-12 text-muted-foreground" weight="duotone" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-white">No genres found</h3>
          <p className="mb-8 max-w-sm text-muted-foreground leading-relaxed">
            Your private library is empty. Add your first genre to start organizing your personal
            collection.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {genres.map((genre) => (
          <MediaCard
            key={genre.id}
            id={genre.id}
            title={genre.name}
            subtitle={undefined}
            coverUrl={undefined}
            link={`/app/library/genres/${genre.id}`}
            coverStyle="square"
            placeholderIcon={
              <MagnifyingGlassIcon className="size-1/2 text-stone-400" weight="duotone" />
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Genres" centerActions>
        <div className="flex items-center gap-4 w-full max-w-xl">
          <SearchInput
            simple
            lockedCategory="genre"
            placeholder="Search in library genres..."
            className="flex-1"
            initialValue={searchQuery}
            onSearch={handleSearch}
          />
          <Button
            variant={isFiltersOpen ? 'secondary' : 'outline'}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="gap-2 h-10 rounded-xl border-white/10"
          >
            <FunnelIcon weight={isFiltersOpen ? 'fill' : 'regular'} />
            Filters
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4">
        {searchQuery && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <SearchCategoryFilters
                selectedCategories={['genre'] as SearchCategory[]}
                onToggle={() => {}}
                lockedCategory="genre"
                className="flex items-center gap-2"
              />
              <div className="h-4 w-px bg-white/10 mx-1" />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchParams((prev) => ({ ...prev, query: '' }));
                }}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}

        {isFiltersOpen && (
          <SearchFilters
            search={searchParams}
            navigate={handleFilterNavigate}
            visibleSections={['general']}
          />
        )}
      </div>

      <div className="flex flex-col gap-8">{renderContent()}</div>
    </div>
  );
}
