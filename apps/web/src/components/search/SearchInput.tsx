import { useSearchSuggestions } from '@/hooks/api/search/useSearchSuggestions';
import { useLibrarySearchSuggestions } from '@/hooks/api/search/useLibrarySearchSuggestions';
import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon, WarningIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useClickAway } from 'react-use';
import { Input } from '../ui/input';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { type SearchSuggestionsResult } from '@repo/contracts';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { SearchScopeToggle } from './SearchScopeToggle';
import { Spinner } from '@/components/ui/spinner';

interface SearchInputProps {
  className?: string;
  initialValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  size?: 'default' | 'sm';
  hideDropdown?: boolean;
}

export function SearchInput({
  className,
  initialValue = '',
  onSearch,
  placeholder,
  size = 'default',
  hideDropdown = false,
}: SearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const searchParams = useSearch({ strict: false });
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { searchScope } = useSearchPreferencesStore();

  const currentScope = searchScope;

  useEffect(() => {
    if ((searchParams as any)?.query) {
      setQuery((searchParams as any).query);
    }
  }, [(searchParams as any)?.query]);

  useEffect(() => {
    if (window.location.pathname.includes('/app/search') && query.trim().length >= 3) {
      handleSearch();
    }
  }, [searchScope]);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  const globalSuggestions = useSearchSuggestions(
    { query: debouncedQuery },
    {
      enabled:
        !hideDropdown && currentScope === 'all' && isOpen && debouncedQuery.trim().length >= 3,
    },
  );

  const librarySuggestions = useLibrarySearchSuggestions(
    { query: debouncedQuery },
    {
      enabled:
        !hideDropdown && currentScope === 'library' && isOpen && debouncedQuery.trim().length >= 3,
    },
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = currentScope === 'all' ? globalSuggestions : librarySuggestions;
  const suggestions = (response as any)?.data;

  useClickAway(containerRef, () => {
    setIsOpen(false);
  });

  const handleSearch = (overrideQuery?: string) => {
    const targetQuery = overrideQuery ?? query;
    const trimmed = targetQuery.trim();
    if (trimmed.length < 3) return;

    setIsOpen(false);
    if (onSearch) {
      onSearch(trimmed);
    } else {
      navigate({
        to: '/app/search',
        search: (prev: any) => ({
          ...prev,
          query: trimmed,
          page: 1,
          filters: {
            ...prev.filters,
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

  const showDropdown = !hideDropdown && isOpen && debouncedQuery.trim().length > 0;

  return (
    <div ref={containerRef} className={cn('flex items-center gap-2 w-full', className)}>
      <div className="relative flex-1">
        <MagnifyingGlassIcon
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer hover:text-white transition-colors',
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
          )}
          onClick={() => handleSearch()}
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (currentScope === 'all' ? 'Search on Playr...' : 'Search in your library...')
          }
          className={cn(
            'pl-9 pr-9 bg-stone-900/50 border-white/10 focus:bg-stone-900 transition-all',
            size === 'sm' ? 'h-8 text-xs pl-8 pr-8' : 'h-10 text-sm',
          )}
        />
        {isFetching && (
          <Spinner
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground',
              size === 'sm' ? 'size-3' : '',
            )}
          />
        )}

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900 border border-white/10 shadow-2xl rounded-lg z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 min-h-[40px]">
              {debouncedQuery.trim().length < 3 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Keep typing to see suggestions…
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Spinner className="h-6 w-6 text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="p-4 flex flex-col items-center gap-2 text-center">
                  <WarningIcon className="h-5 w-5 text-destructive" />
                  <div className="text-sm text-destructive font-medium">Search error</div>
                  <div className="text-xs text-muted-foreground break-all">{error.message}</div>
                </div>
              ) : suggestions && suggestions.results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {suggestions.results.map((result: SearchSuggestionsResult) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery(result.name);
                        if (onSearch) {
                          onSearch(result.name);
                        } else {
                          navigate({
                            to: '/app/search',
                            search: (prev: any) => ({
                              ...prev,
                              query: result.name,
                              filters: {
                                ...prev.filters,
                                visibility: currentScope === 'library' ? 'private' : undefined,
                              },
                            }),
                          });
                        }
                      }}
                      className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-lg transition-colors text-left group"
                    >
                      <div
                        className={cn(
                          'h-10 w-10 bg-stone-800 overflow-hidden flex-shrink-0 aspect-square',
                          result.type === 'artist' ? 'rounded-full' : 'rounded-lg',
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
                            <MagnifyingGlassIcon className="text-stone-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate group-hover:text-white transition-colors">
                          {result.name}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {result.type}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found for "{debouncedQuery}"
                </div>
              )}
            </div>
            {suggestions && suggestions.results.length > 0 && (
              <div className="border-t border-white/5 p-2 bg-white/5">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleSearch();
                  }}
                  className="text-xs text-muted-foreground hover:text-white transition-colors w-full text-center py-1"
                >
                  See all results for "{query}"
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <SearchScopeToggle />
    </div>
  );
}
