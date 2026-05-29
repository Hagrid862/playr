import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, WarningIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useSearchSuggestions } from '@/hooks/api/search/useSearchSuggestions';
import { useLibrarySearchSuggestions } from '@/hooks/api/search/useLibrarySearchSuggestions';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { useClickAway } from 'react-use';
import { useNavigate } from '@tanstack/react-router';
import { Spinner } from '@/components/ui/spinner';
import { type SearchSuggestionsResult } from '@repo/contracts';

interface CompactSearchProps {
  category: 'artist' | 'genre' | 'album' | 'track' | 'playlist' | 'all';
  onResultSelect?: (result: any) => void;
  hideDropdown?: boolean;
}

export function CompactSearch({
  category,
  onResultSelect,
  hideDropdown = false,
}: CompactSearchProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { searchScope } = useSearchPreferencesStore();

  const isExpanded = isHovered || isFocused || query.length > 0;
  const currentScope = searchScope;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  const searchQueryParam = {
    query: debouncedQuery,
    categories: category !== 'all' ? [category] : undefined,
  };

  const globalSuggestions = useSearchSuggestions(searchQueryParam, {
    enabled:
      !hideDropdown && currentScope === 'all' && isExpanded && debouncedQuery.trim().length >= 3,
  });

  const librarySuggestions = useLibrarySearchSuggestions(searchQueryParam, {
    enabled:
      !hideDropdown &&
      currentScope === 'library' &&
      isExpanded &&
      debouncedQuery.trim().length >= 3,
  });

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = currentScope === 'all' ? globalSuggestions : librarySuggestions;
  const suggestions = (response as any)?.data;

  useClickAway(containerRef, () => {
    setIsFocused(false);
  });

  const handleSearch = (overrideQuery?: string) => {
    const targetQuery = overrideQuery ?? query;
    const trimmed = targetQuery.trim();
    if (trimmed.length < 3) return;

    setIsFocused(false);
    if (onResultSelect) {
      onResultSelect({ name: trimmed, category: category !== 'all' ? category : undefined });
    } else {
      navigate({
        to: '/app/search',
        search: (prev: any) => ({
          ...prev,
          query: trimmed,
          page: 1,
          filters: {
            ...prev.filters,
            categories: category !== 'all' ? [category] : undefined,
            visibility: currentScope === 'library' ? 'private' : undefined,
          },
        }),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const showDropdown = !hideDropdown && isExpanded && debouncedQuery.trim().length > 0;

  return (
    <div
      ref={containerRef}
      className="relative z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="compact-search"
    >
      <div
        className={cn(
          'flex items-center justify-center bg-stone-900/50 border border-white/10 rounded-lg transition-all duration-300 ease-in-out cursor-pointer select-none box-border',
          isExpanded ? 'w-64 px-3 h-8 bg-stone-900' : 'w-8 h-8 p-0',
          isFocused &&
            'ring-1 ring-ring border-primary bg-stone-900 ring-offset-background outline-none',
        )}
      >
        <MagnifyingGlassIcon
          className="size-4 shrink-0 text-muted-foreground hover:text-white transition-colors"
          data-testid="compact-search-icon"
          onClick={() => {
            if (!isExpanded) {
              setIsFocused(true);
              // Use setTimeout to ensure the input is rendered before focusing
              setTimeout(() => inputRef.current?.focus(), 0);
            } else {
              handleSearch();
            }
          }}
        />

        {isExpanded && (
          <input
            type="text"
            ref={inputRef}
            placeholder={category === 'all' ? 'Search...' : `Search ${category}s...`}
            className="bg-transparent border-none outline-none text-xs text-foreground ml-2 w-full animate-in fade-in duration-200"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
          />
        )}

        {isFetching && isExpanded && (
          <Spinner className="size-3 text-muted-foreground shrink-0 ml-1" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900 border border-white/10 rounded-xl shadow-2xl z-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-64">
          <div className="p-1.5 min-h-10">
            {debouncedQuery.trim().length < 3 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Keep typing to see suggestions…
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center p-3">
                <Spinner className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-3 flex flex-col items-center gap-1 text-center">
                <WarningIcon className="h-4 w-4 text-destructive" />
                <div className="text-xs text-destructive font-medium">Search error</div>
                <div className="text-[10px] text-muted-foreground break-all">{error.message}</div>
              </div>
            ) : suggestions && suggestions.results.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {suggestions.results.map((result: SearchSuggestionsResult) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      setIsFocused(false);
                      setQuery(result.name);
                      if (onResultSelect) {
                        onResultSelect(result);
                      } else {
                        navigate({
                          to: '/app/search',
                          search: (prev: any) => ({
                            ...prev,
                            query: result.name,
                            filters: {
                              ...prev.filters,
                              type: result.type,
                              visibility: currentScope === 'library' ? 'private' : 'public',
                            },
                          }),
                        });
                      }
                    }}
                    className="flex items-center gap-2 w-full p-1.5 hover:bg-white/5 rounded-lg transition-colors text-left group"
                  >
                    <div
                      className={cn(
                        'h-7 w-7 bg-stone-800 overflow-hidden shrink-0 aspect-square',
                        result.type === 'artist' ? 'rounded-full' : 'rounded-md',
                      )}
                    >
                      {result.coverURL || result.avatarURL ? (
                        <img
                          src={result.coverURL || result.avatarURL || ''}
                          alt={result.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <MagnifyingGlassIcon className="text-stone-600 size-3" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate group-hover:text-white transition-colors">
                        {result.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {result.type}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No results found for "{debouncedQuery}"
              </div>
            )}
          </div>

          {suggestions && suggestions.results.length > 0 && (
            <div className="border-t border-white/5 p-1.5 bg-white/5">
              <button
                onClick={() => {
                  setIsFocused(false);
                  handleSearch();
                }}
                className="text-[11px] text-muted-foreground hover:text-white transition-colors w-full text-center py-0.5"
              >
                See all {category !== 'all' ? `${category}s` : 'results'} for "{query}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
