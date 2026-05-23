import { type SearchResultItem, type SearchResultsResponse } from "@repo/contracts";
import { MagnifyingGlassIcon, MusicNoteIcon, MicrophoneStageIcon, DiscIcon, PlaylistIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { SearchViewType } from "@/stores/search-preferences.store";

export interface SearchResultsData {
  data: SearchResultsResponse['data'] | undefined;
  viewType?: SearchViewType;
}

export function SearchResults({ data, viewType = 'row' }: SearchResultsData) {
  const results = data?.results || [];

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

  const getResultLinkProps = (result: SearchResultItem) => {
    switch (result.type) {
      case 'artist':
        return { to: '/app/library/artists/$id', params: { id: result.id } };
      case 'album':
        return { to: '/app/library/albums/$id', params: { id: result.id } };
      case 'genre':
        return { to: '/app/library/genres/$genreId', params: { genreId: result.id } };
      default:
        return null;
    }
  };

  const renderRowItem = (result: SearchResultItem) => {
    const linkProps = getResultLinkProps(result);
    const content = (
      <div 
        className="group flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/5"
      >
        <div className={cn(
          "h-12 w-12 bg-stone-800 overflow-hidden flex-shrink-0 aspect-square",
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
              <span className="px-1 py-0.5 bg-white/10 rounded text-[10px] font-bold uppercase tracking-tight">E</span>
            )}
            {(result.type === 'track' || result.type === 'album') && result.authorName && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <Link 
                  to="/app/library/artists/$id" 
                  params={{ id: result.authorId || '' }}
                  className="hover:text-white transition-colors cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {result.authorName}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );

    if (linkProps) {
      return (
        <Link key={`${result.type}-${result.id}`} {...(linkProps as any)}>
          {content}
        </Link>
      );
    }

    return <div key={`${result.type}-${result.id}`}>{content}</div>;
  };

  const renderGridItem = (result: SearchResultItem) => {
    const linkProps = getResultLinkProps(result);
    const content = (
      <div className="group flex flex-col gap-3 p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/5 h-full">
        <div className={cn(
          "w-full bg-stone-800 overflow-hidden aspect-square shadow-lg",
          result.type === 'artist' ? 'rounded-full' : 'rounded-xl'
        )}>
          {(result.coverUrl || result.avatarUrl) ? (
            <img 
              src={result.coverUrl || result.avatarUrl || ''} 
              alt={result.name} 
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
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
              <span className="px-1 py-0.5 bg-white/10 rounded text-[10px] font-bold uppercase tracking-tight">E</span>
            )}
            {(result.type === 'track' || result.type === 'album') && result.authorName && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <Link 
                  to="/app/library/artists/$id" 
                  params={{ id: result.authorId || '' }}
                  className="hover:text-white transition-colors cursor-pointer truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {result.authorName}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );

    if (linkProps) {
      return (
        <Link key={`${result.type}-${result.id}`} {...(linkProps as any)}>
          {content}
        </Link>
      );
    }

    return <div key={`${result.type}-${result.id}`}>{content}</div>;
  };

  return (
    <div className="flex flex-col gap-6">
      {topResult && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Best Match</h3>
          {(() => {
            const linkProps = getResultLinkProps(topResult);
            const cardContent = (
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-6 hover:bg-white/10 transition-colors cursor-pointer">
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
                    {topResult.authorName && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <Link 
                          to="/app/library/artists/$id" 
                          params={{ id: topResult.authorId || '' }}
                          className="text-sm text-muted-foreground hover:text-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {topResult.authorName}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );

            return linkProps ? (
              <Link {...(linkProps as any)}>{cardContent}</Link>
            ) : cardContent;
          })()}
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
