import {
  type SearchResultItem,
  type SearchTrackResult,
  type SearchResultsData,
  type SearchResultsResponse,
} from '@repo/contracts';
import {
  MagnifyingGlassIcon,
  MusicNoteIcon,
  MicrophoneStageIcon,
  DiscIcon,
  PlaylistIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from '@tanstack/react-router';
import { SearchViewType } from '@/stores/search-preferences.store';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import { Fragment } from 'react';

export type { SearchResultsData, SearchResultsResponse };

export interface SearchResultsProps {
  data: {
    results: SearchResultItem[];
  } | null | undefined;
  viewType?: SearchViewType;
  isLibrarySearch?: boolean;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function SearchResults({ data, viewType = 'grid' }: SearchResultsProps) {
  const results = data?.results || [];
  const navigate = useNavigate();
  const { playTrack } = usePlayerStore();

  if (results.length === 0) {
    return (
      <div className="p-12 text-center" data-testid="search-results-empty">
        <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-stone-700 mb-4" />
        <p className="text-lg font-medium">No results found</p>
        <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  const topResult = results[0].score >= 0.65 ? results[0] : null;
  const remainingResults = topResult ? results.slice(1) : results;

  const handleItemClick = (result: SearchResultItem) => {
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
      case 'playlist':
        navigate({ to: '/app/playlists/$playlistId', params: { playlistId: result.id } });
        break;
      case 'track':
        {
          const trackResult = result as SearchTrackResult;
          playTrack(
            zodTrackToPlaybackTrack({
              id: trackResult.id,
              title: trackResult.name,
              trackNumber: trackResult.trackNumber ?? 1,
              diskNumber: trackResult.diskNumber ?? 1,
              duration: trackResult.duration ?? 0,
              listenedCount: trackResult.listenedCount ?? 0,
              explicit: !!trackResult.explicit,
              lyrics: null,
              albumId: trackResult.albumId ?? '',
              visibility: result.visibility,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
              artists: trackResult.authors.map((a) => ({ id: a.id, name: a.name })),
              album: trackResult.coverUrl
                ? {
                    id: trackResult.albumId ?? '',
                    name: '',
                    cover: { url: trackResult.coverUrl },
                  }
                : undefined,
            } as any),
          );
        }
        break;
    }
  };

  const renderRowItem = (result: SearchResultItem) => {
    return (
      <div
        key={`${result.type}-${result.id}`}
        data-testid={`search-result-row-${result.id}`}
        onClick={() => handleItemClick(result)}
        className={cn(
          'group flex items-center gap-4 p-4 rounded-xl transition-all active:scale-[1] cursor-pointer hover:bg-stone-900/40 hover:scale-[1.01]',
        )}
      >
        <div
          className={cn(
            'h-16 w-16 bg-stone-800 overflow-hidden flex-shrink-0 aspect-square shadow-sm',
            result.type === 'artist' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {result.coverUrl || result.avatarUrl ? (
            <img
              src={result.coverUrl || result.avatarUrl || undefined}
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
          <div className="text-lg font-semibold truncate group-hover:text-white transition-colors">
            {result.name}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2 truncate">
            {result.type !== 'album' && <span className="capitalize shrink-0">{result.type}</span>}
            {result.type === 'album' && (
              <span className="capitalize shrink-0">
                {result.albumType?.toLowerCase() || 'Album'}
              </span>
            )}
            {result.type === 'track' && result.explicit === true && (
              <span className="flex items-center justify-center size-3.5 bg-stone-500 text-[10px] font-bold text-stone-950 rounded-[2px] shrink-0">
                E
              </span>
            )}
            {result.type === 'track' && result.duration && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20 shrink-0" />
                <span className="tabular-nums shrink-0">{formatDuration(result.duration)}</span>
              </>
            )}
            {(result.type === 'track' || result.type === 'album') && result.authors?.length > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20 shrink-0" />
                <div className="flex items-center gap-1 truncate">
                  {result.authors.map((author, idx) => (
                    <Fragment key={author.id}>
                      {idx > 0 && <span className="text-muted-foreground/60">, </span>}
                      <Link
                        to="/app/library/artists/$id"
                        params={{ id: author.id }}
                        className="hover:text-white transition-colors cursor-pointer relative z-10 truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {author.name}
                      </Link>
                    </Fragment>
                  ))}
                </div>
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
        data-testid={`search-result-grid-${result.id}`}
        onClick={() => handleItemClick(result)}
        className={cn(
          'group relative p-2 rounded-lg overflow-hidden transition-all duration-150 transform h-full hover:scale-[1.02] active:scale-[1.00] hover:bg-stone-800/30 active:bg-stone-800/45 cursor-pointer',
        )}
      >
        <div
          className={cn(
            'w-full bg-stone-800 overflow-hidden aspect-square shadow-lg mb-4',
            result.type === 'artist' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {result.coverUrl || result.avatarUrl ? (
            <img
              src={result.coverUrl || result.avatarUrl || undefined}
              alt={result.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              {result.type === 'artist' && (
                <MicrophoneStageIcon size={40} className="text-stone-600" />
              )}
              {result.type === 'album' && <DiscIcon size={40} className="text-stone-600" />}
              {result.type === 'track' && <MusicNoteIcon size={40} className="text-stone-600" />}
              {result.type === 'playlist' && <PlaylistIcon size={40} className="text-stone-600" />}
              {result.type === 'genre' && (
                <MagnifyingGlassIcon size={40} className="text-stone-600" />
              )}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="font-bold truncate group-hover:text-white transition-colors">
            {result.name}
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 min-w-0">
            {result.type !== 'album' && <span className="capitalize shrink-0">{result.type}</span>}
            {result.type === 'album' && (
              <span className="capitalize shrink-0">
                {result.albumType?.toLowerCase() || 'Album'}
              </span>
            )}
            {result.type === 'track' && result.explicit === true && (
              <span className="flex items-center justify-center size-3.5 bg-stone-500 text-[10px] font-bold text-stone-950 rounded-[2px] shrink-0">
                E
              </span>
            )}
            {result.type === 'track' && result.duration && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20 shrink-0" />
                <span className="tabular-nums shrink-0">{formatDuration(result.duration)}</span>
              </>
            )}
            {(result.type === 'track' || result.type === 'album') && result.authors?.length > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/20 shrink-0" />
                <div className="flex items-center gap-1 truncate max-w-full">
                  {result.authors.map((author, idx) => (
                    <Fragment key={author.id}>
                      {idx > 0 && <span className="text-muted-foreground/60">, </span>}
                      <Link
                        to="/app/library/artists/$id"
                        params={{ id: author.id }}
                        className="hover:text-white transition-colors cursor-pointer relative z-10 truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {author.name}
                      </Link>
                    </Fragment>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6" data-testid="search-results">
      {topResult && (
        <div className="flex flex-col gap-2" data-testid="search-results-best-match">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Best Match
          </h3>
          <div
            data-testid="search-result-best-match-card"
            onClick={() => handleItemClick(topResult)}
            className={cn(
              'p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-6 transition-all transform shadow-lg hover:bg-white/10 hover:scale-[1.01] active:scale-[1.00] cursor-pointer',
            )}
          >
            <div
              className={cn(
                'h-24 w-24 bg-stone-800 overflow-hidden flex-shrink-0 aspect-square shadow-md',
                topResult.type === 'artist' ? 'rounded-full' : 'rounded-lg',
              )}
            >
              {topResult.coverUrl || topResult.avatarUrl ? (
                <img
                  src={topResult.coverUrl || topResult.avatarUrl || undefined}
                  alt={topResult.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  {topResult.type === 'artist' && (
                    <MicrophoneStageIcon size={32} className="text-stone-600" />
                  )}
                  {topResult.type === 'album' && <DiscIcon size={32} className="text-stone-600" />}
                  {topResult.type === 'track' && (
                    <MusicNoteIcon size={32} className="text-stone-600" />
                  )}
                  {topResult.type === 'playlist' && (
                    <PlaylistIcon size={32} className="text-stone-600" />
                  )}
                  {topResult.type === 'genre' && (
                    <MagnifyingGlassIcon size={32} className="text-stone-600" />
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-3xl font-bold truncate">{topResult.name}</div>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground truncate">
                <span className="inline-block px-2 py-0.5 bg-white/10 rounded text-xs uppercase font-medium tracking-wider text-white shrink-0">
                  {topResult.type === 'album'
                    ? topResult.albumType?.toLowerCase() || 'album'
                    : topResult.type}
                </span>
                {topResult.type === 'track' && topResult.duration && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20 shrink-0" />
                    <span className="tabular-nums shrink-0">
                      {formatDuration(topResult.duration)}
                    </span>
                  </>
                )}
                {(topResult.type === 'track' || topResult.type === 'album') &&
                  topResult.authors?.length > 0 && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-white/20 shrink-0" />
                      <div className="flex items-center gap-1 truncate">
                        {topResult.authors.map((author, idx) => (
                          <Fragment key={author.id}>
                            {idx > 0 && <span className="text-muted-foreground/60">, </span>}
                            <Link
                              to="/app/library/artists/$id"
                              params={{ id: author.id }}
                              className="hover:text-white transition-colors relative z-10 truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {author.name}
                            </Link>
                          </Fragment>
                        ))}
                      </div>
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {remainingResults.length > 0 && (
        <div className="flex flex-col gap-2" data-testid="search-results-remaining">
          {topResult && (
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              More Results
            </h3>
          )}

          {/* Desktop/Tablet View */}
          <div
            className={cn(
              'hidden sm:grid',
              viewType === 'grid' ? 'grid-cols-3 lg:grid-cols-6 gap-2' : 'grid-cols-1 gap-2',
            )}
          >
            {remainingResults.map((result: SearchResultItem) =>
              viewType === 'grid' ? renderGridItem(result) : renderRowItem(result),
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
