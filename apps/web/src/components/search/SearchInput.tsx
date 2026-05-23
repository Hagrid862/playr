import { useSearchSuggestions } from '@/hooks/api/search/useSearchSuggestions';
import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon, CircleNotchIcon, WarningIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useClickAway } from 'react-use';
import { Input } from '../ui/input';
import { useNavigate } from '@tanstack/react-router';
import type { SearchSuggestionsResult } from '@repo/contracts';

interface SearchInputProps {
  className?: string;
  initialValue?: string;
  onSearch?: (query: string) => void;
}

export function SearchInput({ className, initialValue = '', onSearch }: SearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

  const { data: suggestions, isLoading, isFetching, error } = useSearchSuggestions(
    { query: debouncedQuery },
    { enabled: isOpen && debouncedQuery.trim().length >= 3 },
  );

  useClickAway(containerRef, () => {
    setIsOpen(false);
  });

  const handleSearch = () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return;

    setIsOpen(false);
    if (onSearch) {
      onSearch(trimmed);
    } else {
      navigate({
        to: '/app/search',
        search: (prev: any) => ({ ...prev, query: trimmed, page: 1 }),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const showDropdown = isOpen && (debouncedQuery.trim().length > 0);

  return (
    <div ref={containerRef} className={cn('relative w-full sm:w-80 md:w-96 lg:w-[450px]', className)}>
      <div className="relative">
        <MagnifyingGlassIcon 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 cursor-pointer hover:text-white transition-colors" 
          onClick={handleSearch}
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
          placeholder="Search for artists, albums, tracks..."
          className="pl-9 pr-9 bg-stone-900/50 border-white/10 focus:bg-stone-900 transition-all rounded-full h-10"
        />
        {isFetching && (
          <CircleNotchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 min-h-[40px]">
            {debouncedQuery.trim().length < 3 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Keep typing to see suggestions…
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center p-4">
                <CircleNotchIcon className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-4 flex flex-col items-center gap-2 text-center">
                <WarningIcon className="h-5 w-5 text-destructive" />
                <div className="text-sm text-destructive font-medium">Search error</div>
                <div className="text-xs text-muted-foreground break-all">{error.message}</div>
              </div>
            ) : suggestions && suggestions.data.results.length > 0 ? (
              <div className="flex flex-col gap-1">
                {suggestions.data.results.map((result: SearchSuggestionsResult) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery(result.name);
                      navigate({
                        to: '/app/search',
                        search: (prev: any) => ({ ...prev, query: result.name }),
                      });
                    }}
                    className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-lg transition-colors text-left group"
                  >
                    <div className="h-10 w-10 bg-stone-800 rounded flex-shrink-0 overflow-hidden">
                      {(result.coverURL || result.avatarURL) ? (
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
                      <div className="text-sm font-medium truncate group-hover:text-white transition-colors">{result.name}</div>
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
          </div>
          {suggestions && suggestions.data.results.length > 0 && (
            <div className="border-t border-white/5 p-2 bg-white/5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate({
                    to: '/app/search',
                    search: (prev: any) => ({ ...prev, query }),
                  });
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
  );
}
