import { type SearchResultItem, type SearchResultsResponse } from "@repo/contracts";
import { MagnifyingGlassIcon, MusicNoteIcon, MicrophoneStageIcon, DiscIcon, PlaylistIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { SearchViewType } from "@/stores/search-preferences.store";

export interface SearchResultsData {
  data: any;
  viewType?: SearchViewType;
  isLibrarySearch?: boolean;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function SearchResults({ data, viewType = 'grid', isLibrarySearch = false }: SearchResultsData) {
  const results = data?.results || [];
  const navigate = useNavigate();

  if (results.length === 0) {
    return (
      <div className="p-12 text-center">
        <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-stone-700 mb-4" />
        <p className="text-lg font-medium">No results found</p>
        <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  const topResult = results[0].score >= 0.65 ? results[0] : null;
  const remainingResults = topResult ? results.slice(1) : results;

  const handleItemClick = (result: SearchResultItem) => {
    if (!isLibrarySearch) return;

    switch (result.type) {
      case 'artist':
        navigate({ to: '/app/library/artists/$id', params: { id: result.id } });
        break;
      case 'album':
        navigate({ to: '/app/library/albums/$id', params: { id: result.id } });
        break;
      case 'genre':
        navigate({ to: '/app/library/genres/$genreId', params: { genreId: result.id } });
        break;
      case 'track':
        // TODO: Implement track navigation once a dedicated tracks page is available.
        break;
    }
  };

  const renderRowItem = (result: SearchResultItem) => {
    return (
      <div 
        key={`${result.type}-${result.id}`}
        onClick={() => handleItemClick(result)}
        className={cn(
            "group flex items-center gap-4 p-4 rounded-xl transition-all active:scale-[1]",
            isLibrarySearch ? "cursor-pointer hover:bg-stone-900/40 hover:scale-[1.01]" : "cursor-default"
        )}
      >
        <div className={cn(
          "h-16 w-16 bg-stone-800 overflow-hidden flex-shrink-0 aspect-square shadow-sm",
          result.type === 'artist' ? 'rounded-full' : 'rounded-lg'
        )}>
          {(result.coverUrl || result.avatarUrl) ? (
            <img 
              src={result.coverUrl || result.avatarUrl || ''} 
              alt={result.name} 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              {result.type === 'artist' && <MicrophoneStageIcon className="text-stone-600" />}
              {result.type === 'album' && <DiscIcon className="text-stone-600" />}
              {result.type === 'track' && <MusicNoteIcon className="text-stone-600" />}
              {result.type === 'playlist' && <PlaylistIcon className="text-stone-600" />}
              {result.type === 'genre' && <MagnifyingGlassIcon className="text-stone-600" />}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold truncate group-hover:text-white transition-colors">{result.name}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {result.type !== 'album' && <span className="capitalize">{result.type}</span>}
            {result.type === 'album' && (
              <span className="capitalize">{result.albumType?.toLowerCase() || 'Album'}</span>
            )}
            {result.type === 'track' && result.explicit === true && (
              <span className="flex items-center justify-center size-3.5 bg-stone-500 text-[10px] font-bold text-stone-950 rounded-[2px] shrink-0">
                E
              </span>
            )}
            {result.type === 'track' && result.duration && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span className="tabular-nums">{formatDuration(result.duration)}</span>
              </>
            )}
            {(result.type === 'track' || result.type === 'album') && result.authorName && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                {isLibrarySearch ? (
                  <Link 
                    to="/app/library/artists/$id" 
                    params={{ id: result.authorId || '' }}
                    className="hover:text-white transition-colors cursor-pointer relative z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {result.authorName}
                  </Link>
                ) : (
                  <span>{result.authorName}</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGridItem = (result: SearchResultItem) => {
    return (
      <div 
        key={`${result.type}-${result.id}`}
        onClick={() => handleItemClick(result)}
        className={cn(
            "group relative p-2 rounded-lg overflow-hidden transition-all duration-150 transform h-full",
            isLibrarySearch ? "hover:scale-[1.02] active:scale-[1.00] hover:bg-stone-800/30 active:bg-stone-800/45 cursor-pointer" : "cursor-default"
        )}
      >
        <div className={cn(
          "w-full bg-stone-800 overflow-hidden aspect-square shadow-lg mb-4",
          result.type === 'artist' ? 'rounded-full' : 'rounded-lg'
        )}>
          {(result.coverUrl || result.avatarUrl) ? (
            <img 
              src={result.coverUrl || result.avatarUrl || ''} 
              alt={result.name} 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              {result.type === 'artist' && <MicrophoneStageIcon size={40} className="text-stone-600" />}
              {result.type === 'album' && <DiscIcon size={40} className="text-stone-600" />}
              {result.type === 'track' && <MusicNoteIcon size={40} className="text-stone-600" />}
              {result.type === 'playlist' && <PlaylistIcon size={40} className="text-stone-600" />}
              {result.type === 'genre' && <MagnifyingGlassIcon size={40} className="text-stone-600" />}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="font-bold truncate group-hover:text-white transition-colors">{result.name}</div>
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
            {result.type !== 'album' && <span className="capitalize">{result.type}</span>}
            {result.type === 'album' && (
              <span className="capitalize">{result.albumType?.toLowerCase() || 'Album'}</span>
            )}
            {result.type === 'track' && result.explicit === true && (
              <span className="flex items-center justify-center size-3.5 bg-stone-500 text-[10px] font-bold text-stone-950 rounded-[2px] shrink-0">
                E
              </span>
            )}
            {result.type === 'track' && result.duration && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span className="tabular-nums">{formatDuration(result.duration)}</span>
              </>
            )}
            {(result.type === 'track' || result.type === 'album') && result.authorName && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                {isLibrarySearch ? (
                  <Link 
                    to="/app/library/artists/$id" 
                    params={{ id: result.authorId || '' }}
                    className="hover:text-white transition-colors cursor-pointer truncate relative z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {result.authorName}
                  </Link>
                ) : (
                  <span className="truncate">{result.authorName}</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {topResult && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Best Match</h3>
          <div 
            onClick={() => handleItemClick(topResult)}
            className={cn(
              "p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-6 transition-all transform shadow-lg",
              isLibrarySearch ? "hover:bg-white/10 hover:scale-[1.01] active:scale-[1.00] cursor-pointer" : "cursor-default"
            )}
          >
            <div className={cn(
              "h-24 w-24 bg-stone-800 overflow-hidden flex-shrink-0 shadow-xl aspect-square",
              topResult.type === 'artist' ? 'rounded-full' : 'rounded-xl'
            )}>
              {(topResult.coverUrl || topResult.avatarUrl) ? (
                <img src={topResult.coverUrl || topResult.avatarUrl || ''} alt={topResult.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                    {topResult.type === 'artist' && <MicrophoneStageIcon size={32} className="text-stone-600" />}
                </div>
              )}
            </div>
            <div>
              <div className="text-3xl font-bold">{topResult.name}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-block px-2 py-0.5 bg-white/10 rounded text-xs uppercase font-medium tracking-wider">
                  {topResult.type === 'album' ? (topResult.albumType?.toLowerCase() || 'album') : topResult.type}
                </span>
                {topResult.type === 'track' && topResult.duration && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="text-sm text-muted-foreground tabular-nums">{formatDuration(topResult.duration)}</span>
                  </>
                )}
                {topResult.authorName && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    {isLibrarySearch ? (
                      <Link 
                        to="/app/library/artists/$id" 
                        params={{ id: topResult.authorId || '' }}
                        className="text-sm text-muted-foreground hover:text-white transition-colors relative z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {topResult.authorName}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">{topResult.authorName}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {remainingResults.length > 0 && (
        <div className="flex flex-col gap-2">
          {topResult && <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">More Results</h3>}
          
          {/* Desktop/Tablet View */}
          <div className={cn(
            "hidden sm:grid",
            viewType === 'grid' 
              ? "grid-cols-3 lg:grid-cols-6 gap-2"
              : "grid-cols-1 gap-2"
          )}>
            {remainingResults.map((result: SearchResultItem) => 
              viewType === 'grid' ? renderGridItem(result) : renderRowItem(result)
            )}
          </div>

          {/* Mobile View (Always Row) */}
          <div className="flex flex-col gap-2 sm:hidden">
            {remainingResults.map((result: SearchResultItem) => renderRowItem(result))}
          </div>
        </div>
      )}
    </div>
  );
}

