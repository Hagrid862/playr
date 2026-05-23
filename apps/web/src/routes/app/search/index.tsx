import {createFileRoute} from '@tanstack/react-router';
import { SearchQuerySchema, type SearchCategory, type SearchQuery, type SearchOrderByField } from '@repo/contracts';
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
  MagnifyingGlassIcon
} from '@phosphor-icons/react';
import {useEffect, useState} from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults, SearchResultsData } from '@/components/search/SearchResults';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { Skeleton } from '@/components/ui/skeleton';

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
        Object.entries(rawSearch || {}).filter(([, v]) => v !== '' && v !== undefined)
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
  const { viewType, setViewType, setLastQuery } = useSearchPreferencesStore();

  useEffect(() => {
    if (search.query) {
      setLastQuery(search.query);
    }
  }, [search.query, setLastQuery]);

  const isLibrarySearch = search.filters?.visibility === 'private';

  const globalResults = useSearch(search, { enabled: !isLibrarySearch && !!search.query });
  const libraryResults = useLibrarySearch(search, { enabled: isLibrarySearch && !!search.query });

  const { data: response, isLoading, error } = isLibrarySearch ? libraryResults : globalResults;
  const data = (response as SearchResultsData)?.data;

  // ... (toggleCategory unchanged)

  if (!search.query || search.query.trim() === '') {
    return (
      <div className="flex flex-col gap-4 p-4 min-h-[60vh]">
        <PageHeader
            title="Search"
            centerActions
        >
            <SearchInput
                className="max-w-xl"
                initialValue={search.query}
            />
        </PageHeader>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <MagnifyingGlassIcon className="w-6 h-6 mr-2" />
            Start searching...
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
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title="Search"
        centerActions
      >
        <SearchInput
          className="max-w-xl"
          initialValue={search.query}
        />
      </PageHeader>
      
      <div className="flex flex-col gap-4">
        {/* Controls Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button
            variant={isFiltersOpen ? "secondary" : "outline"}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className=" gap-2"
          >
            <FunnelIcon weight={isFiltersOpen ? "fill" : "regular"} />
            Filters
          </Button>
          
          <div className="h-4 w-px bg-white/10 mx-1" />

          {['artist', 'album', 'track', 'playlist', 'genre'].map((cat) => (
            <Button
              key={cat}
              variant={(search.filters?.categories as SearchCategory[] | undefined)?.includes(cat as SearchCategory) ? "secondary" : "outline"}
              onClick={() => toggleCategory(cat)}
              className=" capitalize"
            >
              {cat}s
            </Button>
          ))}

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

            <span className="text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap hidden md:inline">Sort</span>
            <Select 
              value={search.orderBy?.field || 'relevance'}
              onValueChange={(val) => navigate({
                search: (prev: SearchQuery) => ({
                  ...prev,
                  orderBy: { field: val as SearchOrderByField, direction: prev.orderBy?.direction || 'asc' }
                } as SearchQuery)
              })}
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
              onClick={() => navigate({
                search: (prev: SearchQuery) => ({
                  ...prev,
                  orderBy: {
                    field: (prev.orderBy?.field || 'relevance') as SearchOrderByField,
                    direction: prev.orderBy?.direction === 'asc' ? 'desc' : 'asc'
                  }
                } as SearchQuery)
              })}
            >
              {search.orderBy?.direction === 'desc' ? <SortDescendingIcon /> : <SortAscendingIcon />}
            </Button>
          </div>
        </div>

        {isFiltersOpen && (
          <SearchFilters search={search} navigate={navigate} />
        )}
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
          <SearchResults 
            data={data} 
            viewType={viewType} 
            isLibrarySearch={isLibrarySearch} 
          />
        )}
      </div>
    </div>
  );
}
