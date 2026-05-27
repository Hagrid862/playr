import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Outlet, createFileRoute, useLocation, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import {
  type LibrarySearchQuery,
  type SearchResultsData,
  type SearchCategory,
  type SearchOrderByField,
} from '@repo/contracts';
import { useLibrarySearch } from '@/hooks/api/search/useLibrarySearch';
import { SearchResults } from '@/components/search/SearchResults';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { Button } from '@/components/ui/button';
import {
  ListIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react';
import { SearchCategoryFilters } from '@/components/search/SearchCategoryFilters';
import { SearchFilters } from '@/components/search/SearchFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { SubHeader } from '@/components/app/SubHeader';
import { CompactSearch } from '@/components/search/CompactSearch';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';
import { LibraryNav } from '@/components/library/LibraryNav';

export const Route = createFileRoute('/app/library/overview')({
  component: OverviewLayout,
  staticData: {
    title: 'Overview',
    description: 'Library',
  },
});

function OverviewLayout() {
  usePersistentNavigation('overview', '/app/library/overview');
  const location = useLocation();
  const router = useRouter();
  const { viewType, setViewType } = useSearchPreferencesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<LibrarySearchQuery>({
    query: '',
    filters: {
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

  const searchData = searchResponse?.data as SearchResultsData | undefined;

  const handleFilterNavigate = (params: {
    search: (prev: LibrarySearchQuery) => LibrarySearchQuery;
  }) => {
    setSearchParams((prev) => params.search(prev));
  };

  const toggleCategory = (category: SearchCategory) => {
    setSearchParams((prev) => {
      const categories = (prev.filters?.categories ?? []) as SearchCategory[];
      const newCategories = categories.includes(category)
        ? categories.filter((c) => c !== category)
        : [...categories, category];

      return {
        ...prev,
        filters: {
          ...prev.filters,
          categories: newCategories.length > 0 ? newCategories : undefined,
        },
        page: 1,
      };
    });
  };

  const isIndex =
    location.pathname === '/app/library/overview' || location.pathname === '/app/library/overview/';
  const isCategoryIndex =
    location.pathname === '/app/library/overview/private' ||
    location.pathname === '/app/library/overview/private/' ||
    location.pathname === '/app/library/overview/community' ||
    location.pathname === '/app/library/overview/community/' ||
    location.pathname === '/app/library/overview/public' ||
    location.pathname === '/app/library/overview/public/';

  const getCategory = () => {
    const segment = location.pathname.split('/').filter(Boolean).pop();
    if (segment === 'private' || segment === 'community' || segment === 'public') {
      return segment;
    }
    return 'all';
  };

  const currentCategory = getCategory();

  const handleContentTypeChange = (contentType: string) => {
    if (contentType === currentCategory) {
      return;
    }

    if (contentType === 'all') {
      router.navigate({
        to: '/app/library/overview',
      });
    } else {
      router.navigate({
        to: `/app/library/overview/${contentType}`,
      });
    }
  };

  const renderSearchContent = () => {
    if (isSearchLoading) {
      return (
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

    return <SearchResults data={searchData as any} viewType={viewType} isLibrarySearch={true} />;
  };

  const isSearchActive = searchQuery && searchQuery.length >= 3;

  return (
    <div className="flex flex-col">
      <SubHeader
        title="Overview"
        showBackButton={!isIndex}
        search={<CompactSearch category="all" />}
      >
        {isIndex || isCategoryIndex ? (
          <Select value={currentCategory} onValueChange={handleContentTypeChange}>
            <SelectTrigger className="w-[150px] sm:w-[180px] h-7">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectGroup>
                <SelectItem value="all">All Content</SelectItem>
                <SelectItem value="private">Private Library</SelectItem>
                <SelectItem value="community">Community Library</SelectItem>
                <SelectItem value="public">Public Library</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}
      </SubHeader>

      <LibraryNav />

      <div className="p-4 flex flex-col gap-4">
        {/* Page Content */}
        {(isSearchActive || isFiltersOpen) && (
          <>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              <div className={isSearchActive ? 'h-4 w-px bg-white/10 mx-1' : ''} />

              <SearchCategoryFilters
                selectedCategories={(searchParams.filters?.categories as SearchCategory[]) ?? []}
                onToggle={toggleCategory}
                className="flex items-center gap-2"
              />

              {searchQuery && (
                <>
                  <div className="h-4 w-px bg-white/10 mx-1" />
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchParams((prev) => ({ ...prev, query: '' }));
                    }}
                    className="text-sm text-muted-foreground hover:text-white transition-colors whitespace-nowrap"
                  >
                    Clear Search
                  </button>
                </>
              )}

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
                  value={searchParams.orderBy?.field || 'relevance'}
                  onValueChange={(val) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      orderBy: {
                        field: val as SearchOrderByField,
                        direction: prev.orderBy?.direction || 'asc',
                      },
                    }))
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
                    setSearchParams((prev) => ({
                      ...prev,
                      orderBy: {
                        field: (prev.orderBy?.field || 'relevance') as SearchOrderByField,
                        direction: prev.orderBy?.direction === 'asc' ? 'desc' : 'asc',
                      },
                    }))
                  }
                >
                  {searchParams.orderBy?.direction === 'desc' ? (
                    <SortDescendingIcon />
                  ) : (
                    <SortAscendingIcon />
                  )}
                </Button>
              </div>
            </div>

            {isFiltersOpen && (
              <SearchFilters search={searchParams} navigate={handleFilterNavigate} />
            )}
          </>
        )}

        <div className="flex-1">{isSearchActive ? renderSearchContent() : <Outlet />}</div>
      </div>
    </div>
  );
}
