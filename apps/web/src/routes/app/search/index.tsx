import {createFileRoute, redirect} from '@tanstack/react-router';
import { SearchQuerySchema, type SearchCategory } from '@repo/contracts';
import { useSearch } from '@/hooks/api/search/useSearch';
import { SearchInput } from '@/components/search/SearchInput';
import { PageHeader } from '@/components/app/PageHeader';
import { 
  FunnelIcon, 
  SortAscendingIcon, 
  SortDescendingIcon,
  SquaresFourIcon,
  ListIcon
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults, SearchResultsData } from '@/components/search/SearchResults';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';

export const Route = createFileRoute('/app/search/')({
  validateSearch: (search) => SearchQuerySchema.parse(search),
  beforeLoad: ({ search }) => {
    if (!search.query || search.query.trim() === '') {
      throw redirect({ to: '/app' });
    }
  },
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { viewType, setViewType } = useSearchPreferencesStore();

  const { data: response, isLoading, error } = useSearch(search);
  const data = (response as SearchResultsData)?.data;

  const toggleCategory = (category: string) => {
    navigate({
      search: (prev) => {
        const categories = prev.filters?.categories || [];
        const newCategories = categories.includes(category as any)
          ? categories.filter((c: SearchCategory) => c !== category)
          : [...categories, category as any];
        
        return { 
          ...prev, 
          filters: {
            ...prev.filters,
            categories: newCategories.length > 0 ? newCategories : undefined,
          },
          page: 1 
        };
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title="Search"
        actions={
          <SearchInput
            className="max-w-xl"
            initialValue={search.query}
          />
        }
        centerActions
      />
      
      <div className="flex flex-col gap-4">
        {/* Controls Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button
            variant={isFiltersOpen ? "secondary" : "outline"}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="gap-2"
          >
            <FunnelIcon weight={isFiltersOpen ? "fill" : "regular"} />
            Filters
          </Button>
          
          <div className="h-4 w-px bg-white/10 mx-1" />

          {['artist', 'album', 'track', 'playlist', 'genre'].map((cat) => (
            <Button
              key={cat}
              variant={search.filters?.categories?.includes(cat as any) ? "secondary" : "outline"}
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
                search: (prev) => ({
                  ...prev,
                  orderBy: { field: val as any, direction: prev.orderBy?.direction || 'asc' }
                })
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
                search: (prev) => ({
                  ...prev,
                  orderBy: {
                    field: prev.orderBy?.field || 'relevance' as any,
                    direction: prev.orderBy?.direction === 'asc' ? 'desc' : 'asc'
                  }
                })
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
          <div className="flex flex-col gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 w-full bg-stone-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center border border-white/5 rounded-2xl bg-stone-900/20">
            <p className="text-destructive font-medium">Failed to load search results</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        ) : (
          <SearchResults data={data} viewType={viewType} />
        )}
      </div>
    </div>
  );
}
