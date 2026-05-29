import { Button } from '@/components/ui/button';
import { type SearchScope, useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { cn } from '@/lib/utils';
import { GlobeIcon, BooksIcon } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect } from 'react';

interface SearchScopeToggleProps {
  className?: string;
  lockedScope?: SearchScope;
  size?: 'default' | 'sm' | 'md';
}

export function SearchScopeToggle({ className, size = 'default' }: SearchScopeToggleProps) {
  const { setSearchScope } = useSearchPreferencesStore();

  useEffect(() => {
    // Force search scope to library for now until public search is implemented.
    setSearchScope('library');
  }, []);

  // TODO: Implement public search functionality and remove lockedScope constraint.
  // const currentScope = 'library'; // Forced to library for now
  // const isLocked = true; // Always locked for now

  const sizeClasses =
    size === 'sm'
      ? { container: 'h-7', button: 'h-5 w-7', icon: 14, btnSize: 'icon-xs' as const }
      : size === 'md'
        ? { container: 'h-8', button: 'h-6 w-8', icon: 15, btnSize: 'icon-xs' as const }
        : { container: 'h-10', button: 'h-8 w-10', icon: 18, btnSize: 'sm' as const };

  return (
    <TooltipProvider>
      <div
        data-testid="search-scope-toggle"
        className={cn(
          'flex items-center bg-stone-900 border border-white/10 rounded-lg p-1',
          sizeClasses.container,
          className,
        )}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size={sizeClasses.btnSize}
              data-testid="scope-toggle-all"
              className={cn(
                'rounded-lg opacity-50 cursor-not-allowed',
                sizeClasses.button,
              )}
            >
              <GlobeIcon size={sizeClasses.icon} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 text-sm">
            Public search is not yet implemented.
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size={sizeClasses.btnSize}
              data-testid="scope-toggle-library"
              className={cn('rounded-lg', sizeClasses.button)}
              aria-pressed="true"
            >
              <BooksIcon size={sizeClasses.icon} weight="fill" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search Library</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
