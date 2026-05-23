import { Button } from "@/components/ui/button";
import { type SearchScope } from "@/stores/search-preferences.store";
import { cn } from "@/lib/utils";
import { GlobeIcon, BooksIcon } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SearchScopeToggleProps {
  className?: string;
  lockedScope?: SearchScope;
}

export function SearchScopeToggle({ className }: SearchScopeToggleProps) {
  // const { searchScope, setSearchScope } = useSearchPreferencesStore();
  
  // TODO: Implement public search functionality and remove lockedScope constraint.
  // const currentScope = 'library'; // Forced to library for now
  // const isLocked = true; // Always locked for now

  return (
    <TooltipProvider>
      <div className={cn("flex items-center bg-stone-900 border border-white/10 rounded-xl p-1 h-10", className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-10 rounded-lg opacity-50 cursor-not-allowed")}
            >
              <GlobeIcon size={18} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 text-sm">
            Public search is not yet implemented.
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='secondary'
              size="sm"
              className={cn("h-8 w-10 rounded-lg")}
              disabled
            >
              <BooksIcon size={18} weight='fill' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search Library</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
