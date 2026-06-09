import { createFileRoute } from '@tanstack/react-router';
import {
  SearchQuerySchema,
  type SearchCategory,
  type SearchQuery,
  type SearchOrderByField,
} from '@repo/contracts';
import { useSearch } from '@/hooks/api/search/useSearch';
import { useLibrarySearch } from '@/hooks/api/search/useLibrarySearch';
import { SearchInput } from '@/components/search/SearchInput';
import { PageHeader } from '@/components/app/PageHeader';
import {
  FunnelIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  SquaresFourIcon,
  ListIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults, SearchResultsData } from '@/components/search/SearchResults';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchCategoryFilters } from '@/components/search/SearchCategoryFilters';
import { PlayrLogo } from '@/components/app/PlayrLogo';

export const Route = createFileRoute('/app/search/')({
  component: SearchPage,
});

function SearchPage() {
  const rawSearch = Route.useSearch();
  // this fragment is such a garbage, but it works
  // Validate and normalize search params locally instead of via route validateSearch
  let search: SearchQuery;
  const parsed = SearchQuerySchema.safeParse(rawSearch);
  if (parsed.success) {
    search = parsed.data;
  } else {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(rawSearch || {}).filter(([, v]) => v !== '' && v !== undefined),
      );
      const reparsed = SearchQuerySchema.safeParse(cleaned);
      if (reparsed.success) search = reparsed.data as SearchQuery;
      else search = {} as SearchQuery;
    } catch {
      search = {} as SearchQuery;
    }
  }
  const navigate = Route.useNavigate();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { viewType, setViewType, searchHistory, addSearchToHistory, clearHistory } =
    useSearchPreferencesStore();

  useEffect(() => {
    if (search.query) {
      addSearchToHistory(search.query);
    }
  }, [search.query, addSearchToHistory]);

  const isLibrarySearch = search.filters?.visibility === 'private';
  const globalResults = useSearch(search, { enabled: !isLibrarySearch && !!search.query });
  const libraryResults = useLibrarySearch(search, { enabled: isLibrarySearch && !!search.query });

  const { data: response, isLoading, error } = isLibrarySearch ? libraryResults : globalResults;
  const data = (response as SearchResultsData)?.data;

  if (!search.query || search.query.trim() === '') {
    return (
      <div className="flex flex-col gap-4 p-4 min-h-[60vh]">
        <PageHeader title={<PlayrLogo />} description="Search" centerActions>
          <SearchInput className="max-w-xl" initialValue={search.query} />
        </PageHeader>

        {searchHistory.length > 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Searches
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-xs text-muted-foreground"
                >
                  Clear All
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                {searchHistory.map((item) => (
                  <button
                    key={item}
                    onClick={() => navigate({ search: (prev) => ({ ...prev, query: item }) })}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-900/40 transition-colors text-left w-full text-sm"
                  >
                    <MagnifyingGlassIcon className="text-muted-foreground w-4 h-4" />
                    <span className="text-white">{item}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <MagnifyingGlassIcon className="w-6 h-6 mr-2" />
            Start searching...
          </div>
        )}
      </div>
    );
  }

  const toggleCategory = (category: string) => {
    navigate({
      search: (prev: SearchQuery) => {
        const categories = (prev.filters?.categories ?? []) as SearchCategory[];
        const newCategories = categories.includes(category as SearchCategory)
          ? categories.filter((c) => c !== (category as SearchCategory))
          : [...categories, category as SearchCategory];

        return {
          ...prev,
          filters: {
            ...prev.filters,
            categories: newCategories.length > 0 ? newCategories : undefined,
          },
          page: 1,
        } as SearchQuery;
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title={<PlayrLogo />} description="Search" centerActions>
        <SearchInput className="max-w-xl" initialValue={search.query} />
      </PageHeader>

      <div className="flex flex-col gap-4">
        {/* Controls Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button
            variant={isFiltersOpen ? 'secondary' : 'outline'}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className=" gap-2"
          >
            <FunnelIcon weight={isFiltersOpen ? 'fill' : 'regular'} />
            Filters
          </Button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <SearchCategoryFilters
            selectedCategories={(search.filters?.categories as SearchCategory[]) ?? []}
            onToggle={toggleCategory}
            className="flex items-center gap-2"
          />

          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden sm:flex items-center gap-1 bg-stone-900 border border-white/10 rounded-xl p-1 h-10">
              <Button
                variant={viewType === 'row' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setViewType('row')}
              >
                <ListIcon weight={viewType === 'row' ? 'fill' : 'regular'} />
              </Button>
              <Button
                variant={viewType === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setViewType('grid')}
              >
                <SquaresFourIcon weight={viewType === 'grid' ? 'fill' : 'regular'} />
              </Button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

            <span className="text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap hidden md:inline">
              Sort
            </span>
            <Select
              value={search.orderBy?.field || 'relevance'}
              onValueChange={(val) =>
                navigate({
                  search: (prev: SearchQuery) =>
                    ({
                      ...prev,
                      orderBy: {
                        field: val as SearchOrderByField,
                        direction: prev.orderBy?.direction || 'asc',
                      },
                    }) as SearchQuery,
                })
              }
            >
              <SelectTrigger className="w-32 bg-stone-900 border-white/10 h-10 rounded-xl">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="createdAt">Date Added</SelectItem>
                <SelectItem value="releaseDate">Release Date</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="listenedCount">Listened</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-white/10"
              onClick={() =>
                navigate({
                  search: (prev: SearchQuery) =>
                    ({
                      ...prev,
                      orderBy: {
                        field: (prev.orderBy?.field || 'relevance') as SearchOrderByField,
                        direction: prev.orderBy?.direction === 'asc' ? 'desc' : 'asc',
                      },
                    }) as SearchQuery,
                })
              }
            >
              {search.orderBy?.direction === 'desc' ? (
                <SortDescendingIcon />
              ) : (
                <SortAscendingIcon />
              )}
            </Button>
          </div>
        </div>

        {isFiltersOpen && <SearchFilters search={search} navigate={navigate} />}
      </div>

      <div className="flex-1">
        {isLoading ? (
          viewType === 'grid' ? (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3 p-4 bg-stone-900/50 rounded-2xl">
                  <Skeleton className="w-full aspect-square rounded-xl bg-stone-800" />
                  <Skeleton className="h-4 w-2/3 bg-stone-800" />
                  <Skeleton className="h-3 w-1/3 bg-stone-800" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-stone-900/50 rounded-xl">
                  <Skeleton className="h-16 w-16 rounded-lg bg-stone-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/4 bg-stone-800" />
                    <Skeleton className="h-4 w-1/6 bg-stone-800" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : error ? (
          <div className="p-8 text-center border border-white/5 rounded-2xl bg-stone-900/20">
            <p className="text-destructive font-medium">Failed to load search results</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        ) : (
          <SearchResults data={data} viewType={viewType} isLibrarySearch={isLibrarySearch} />
        )}
      </div>
    </div>
  );
}
