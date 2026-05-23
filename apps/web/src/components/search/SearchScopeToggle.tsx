import { Button } from "@/components/ui/button";
import { useSearchPreferencesStore, type SearchScope } from "@/stores/search-preferences.store";
import { cn } from "@/lib/utils";
import { GlobeIcon, BooksIcon } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SearchScopeToggleProps {
  className?: string;
  lockedScope?: SearchScope;
}

export function SearchScopeToggle({ className, lockedScope }: SearchScopeToggleProps) {
  const { searchScope, setSearchScope } = useSearchPreferencesStore();
  
  const currentScope = lockedScope || searchScope;
  const isLocked = !!lockedScope;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center bg-stone-900 border border-white/10 rounded-xl p-1 h-10", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentScope === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("h-8 w-10 rounded-lg", isLocked && currentScope !== 'all' && "opacity-50 grayscale")}
              onClick={() => !isLocked && setSearchScope('all')}
              disabled={isLocked && currentScope !== 'all'}
            >
              <GlobeIcon size={18} weight={currentScope === 'all' ? 'fill' : 'regular'} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search Playr</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentScope === 'library' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("h-8 w-10 rounded-lg", isLocked && currentScope !== 'library' && "opacity-50 grayscale")}
              onClick={() => !isLocked && setSearchScope('library')}
              disabled={isLocked && currentScope !== 'library'}
            >
              <BooksIcon size={18} weight={currentScope === 'library' ? 'fill' : 'regular'} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search Library</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
