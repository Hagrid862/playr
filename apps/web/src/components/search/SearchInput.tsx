import { useSearchSuggestions } from '@/hooks/api/search/useSearchSuggestions';
import { useLibrarySearchSuggestions } from '@/hooks/api/search/useLibrarySearchSuggestions';
import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon, WarningIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  onSearchComplete?: () => void;
  placeholder?: string;
  size?: 'default' | 'sm';
  hideDropdown?: boolean;
  hideScopeToggle?: boolean;
  mobile?: boolean;
  mobileExpanded?: boolean;
  onMobileToggle?: () => void;
  autoFocus?: boolean;
  onEscape?: () => void;
  /** Render suggestions inline (block-level) instead of as a floating dropdown. Used for mobile overlay. */
  resultsInline?: boolean;
}

export function SearchInput({
  className,
  initialValue = '',
  onSearch,
  onSearchComplete,
  placeholder,
  size = 'default',
  hideDropdown = false,
  hideScopeToggle = false,
  mobile = false,
  mobileExpanded = false,
  onMobileToggle,
  autoFocus = false,
  onEscape,
  resultsInline = false,
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

  // Auto-focus the input when autoFocus is enabled (used in overlay mode)
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to allow the overlay animation to start before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  const suggestionsEnabled = resultsInline
    ? debouncedQuery.trim().length >= 3
    : !hideDropdown && isOpen && debouncedQuery.trim().length >= 3;

  const globalSuggestions = useSearchSuggestions(
    { query: debouncedQuery },
    {
      enabled: suggestionsEnabled && currentScope === 'all',
    },
  );

  const librarySuggestions = useLibrarySearchSuggestions(
    { query: debouncedQuery },
    {
      enabled: suggestionsEnabled && currentScope === 'library',
    },
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = currentScope === 'all' ? globalSuggestions : librarySuggestions;
  const suggestions = (response as any)?.data;

  // Click-away handler — disabled in inline mode (overlay manages its own dismissal)
  useEffect(() => {
    if (resultsInline) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [resultsInline]);

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
    onSearchComplete?.();
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();

    // Jeśli jesteśmy na podstronie wyszukiwania, wyczyszczenie inputa resetuje stan wyszukiwania w URL
    if (window.location.pathname.includes('/app/search')) {
      navigate({
        to: '/app/search',
        search: (prev: any) => ({
          ...prev,
          query: undefined,
          page: undefined,
        }),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Mobile expanded state: auto-hide the scope toggle to save space on mobile
  const effectiveHideScopeToggle = hideScopeToggle || (mobile && mobileExpanded);

  const showDropdown =
    !resultsInline && !hideDropdown && isOpen && debouncedQuery.trim().length > 0;
  const showInlineResults = resultsInline && debouncedQuery.trim().length > 0;
  const showClearButton = query.length > 0 && !isFetching;

  // Mobile collapsed state: render just the search icon button
  if (mobile && !mobileExpanded) {
    return (
      <div ref={containerRef} className={cn('flex items-center gap-2', className)}>
        <Button
          variant="ghost"
          size="default"
          className="h-10 w-10 border border-white/10 bg-stone-900/50"
          onClick={onMobileToggle}
          aria-label="Open search"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
        </Button>
        {!hideScopeToggle && <SearchScopeToggle size="default" />}
      </div>
    );
  }

  // Extract suggestions rendering so it can be shared between dropdown and inline modes
  const renderSuggestions = () => (
    <>
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
                onSearchComplete?.();
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
                <div className="text-xs text-muted-foreground capitalize">{result.type}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No results found for "{debouncedQuery}"
        </div>
      )}
      {suggestions && suggestions.results.length > 0 && (
        <div className="border-t">
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
    </>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        resultsInline ? 'flex flex-col w-full' : 'flex items-center gap-2 w-full',
        className,
      )}
    >
      <div className={cn('flex items-center gap-2 w-full', resultsInline && 'shrink-0')}>
        <div className="relative flex-1">
          {mobile && mobileExpanded && (
            <MagnifyingGlassIcon
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer hover:text-white transition-colors z-10',
                size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
              )}
              onClick={() => handleSearch()}
            />
          )}
          {!mobile && (
            <MagnifyingGlassIcon
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer hover:text-white transition-colors z-10',
                size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
              )}
              onClick={() => handleSearch()}
            />
          )}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              handleKeyDown(e);
              // Close on Escape — prefer onEscape callback, fallback to mobile toggle
              if (e.key === 'Escape') {
                if (onEscape) {
                  onEscape();
                } else if (mobile) {
                  onMobileToggle?.();
                }
              }
            }}
            placeholder={
              placeholder ||
              (currentScope === 'all' ? 'Search on Playr...' : 'Search in your library...')
            }
            className={cn(
              'pl-9 bg-stone-900/50 border-white/10 focus:bg-stone-900 transition-all',
              size === 'sm' ? 'h-8 text-xs pl-8' : 'h-10 text-sm',
              mobileExpanded && 'bg-stone-900 border-white/20',
              showClearButton || isFetching
                ? size === 'sm'
                  ? 'pr-8'
                  : 'pr-9'
                : size === 'sm'
                  ? 'pr-4'
                  : 'pr-4',
              mobile && mobileExpanded && 'pl-9',
            )}
          />

          {/* Clear button */}
          {showClearButton && (
            <XIcon
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer hover:text-white transition-colors z-10',
                size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
              )}
              onClick={handleClear}
            />
          )}

          {isFetching && (
            <Spinner
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground',
                size === 'sm' ? 'size-3' : '',
              )}
            />
          )}

          {/* Floating dropdown (desktop only) */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900 border border-white/10 shadow-2xl rounded-lg z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 min-h-[40px]">{renderSuggestions()}</div>
            </div>
          )}
        </div>

        {!effectiveHideScopeToggle && <SearchScopeToggle />}
      </div>

      {/* Inline results (mobile overlay) */}
      {showInlineResults && (
        <div className="flex-1 overflow-y-auto gap-2 mt-2">{renderSuggestions()}</div>
      )}
    </div>
  );
}
