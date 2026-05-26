import { createFileRoute } from '@tanstack/react-router';
import {
  SearchQuerySchema,
  type SearchCategory,
  type SearchQuery,
  type SearchOrderByField,
} from '@repo/contracts';
import { useSearch } from '@/hooks/api/search/useSearch';
import { useLibrarySearch } from '@/hooks/api/search/useLibrarySearch';
import {
  SortAscendingIcon,
  SortDescendingIcon,
  SquaresFourIcon,
  ListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults, SearchResultsData } from '@/components/search/SearchResults';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchCategoryFilters } from '@/components/search/SearchCategoryFilters';
import { SubHeader } from '@/components/app/SubHeader';

export const Route = createFileRoute('/app/search/')({
  component: SearchPage,
  staticData: {
    title: 'Search',
    description: 'Explore Playr',
  },
});

function SearchPage() {
  const rawSearch = Route.useSearch();
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
  const {
    viewType,
    setViewType,
    searchHistory,
    addSearchToHistory,
    clearHistory,
    setLastSearch,
    lastSearch,
  } = useSearchPreferencesStore();

  useEffect(() => {
    const searchString = JSON.stringify(search);
    const lastSearchString = JSON.stringify(lastSearch);

    if (searchString === lastSearchString) return;

    if (search.query) {
      addSearchToHistory(search.query);
      setLastSearch(search);
    } else if (lastSearch !== null) {
      setLastSearch(null);
    }
  }, [search, lastSearch, addSearchToHistory, setLastSearch]);

  const isLibrarySearch = search.filters?.visibility === 'private';
  const globalResults = useSearch(search, { enabled: !isLibrarySearch && !!search.query });
  const libraryResults = useLibrarySearch(search, { enabled: isLibrarySearch && !!search.query });

  const { data: response, isLoading, error } = isLibrarySearch ? libraryResults : globalResults;
  const data = (response as SearchResultsData)?.data;

  if (!search.query || search.query.trim() === '') {
    return (
      <div className="flex flex-col h-full w-full">
        <SubHeader title="Search" />
        <div className="flex-1 p-4 min-h-[60vh]">
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
                      onClick={() => navigate({ search: { query: item, page: 1 } })}
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
    <div className="flex flex-col h-full w-full">
      <SubHeader
        title="Search"
        actions={
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <FunnelIcon size={14} />
                  Filters
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader className="px-6 pt-6">
                  <DialogTitle>Search Filters</DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Categories</h4>
                    <SearchCategoryFilters
                      selectedCategories={(search.filters?.categories as SearchCategory[]) ?? []}
                      onToggle={toggleCategory}
                      className="flex flex-wrap gap-2"
                    />
                  </div>
                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Additional Filters
                    </h4>
                    <SearchFilters search={search} navigate={navigate} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <SearchCategoryFilters
              selectedCategories={(search.filters?.categories as SearchCategory[]) ?? []}
              onToggle={toggleCategory}
              className="flex items-center gap-2"
            />

            <div className="flex items-center gap-2 ml-auto">
              <div className="hidden sm:flex items-center gap-1 bg-stone-900 border border-white/10 rounded-xl p-1 h-9">
                <Button
                  variant={viewType === 'row' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => setViewType('row')}
                >
                  <ListIcon weight={viewType === 'row' ? 'fill' : 'regular'} size={16} />
                </Button>
                <Button
                  variant={viewType === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => setViewType('grid')}
                >
                  <SquaresFourIcon weight={viewType === 'grid' ? 'fill' : 'regular'} size={16} />
                </Button>
              </div>

              <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

              <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap hidden md:inline">
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
                <SelectTrigger className="w-28 bg-stone-900 border-white/10 h-9 text-xs rounded-lg">
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
                className="h-9 w-9 rounded-lg border-white/10"
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
                  <SortDescendingIcon size={16} />
                ) : (
                  <SortAscendingIcon size={16} />
                )}
              </Button>
            </div>

            {/* Filters dialog handled above */}
          </div>
        }
      />
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
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
    </div>
  );
}
