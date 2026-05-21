import { TextField } from '@/components/form/TextField';
import { usePlaylistEditDraft } from '@/components/playlists/playlist-edit-draft.context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { CameraIcon, ImageIcon, TrashIcon } from '@phosphor-icons/react';

export function PlaylistEditHero() {
  const {
    detail,
    draftName,
    setDraftName,
    titleError,
    coverInputRef,
    coverFile,
    setCoverFile,
    removeCover,
    scheduleRemoveCover,
    undoRemoveCover,
    initialSnapshot,
    draftTrackIds,
  } = usePlaylistEditDraft();

  const filePreviewUrl = useObjectUrl(coverFile);

  const existingCoverUrl =
    detail?.cover?.url != null && detail.cover.url !== '' ? detail.cover.url : null;
  const hasSavedCover = Boolean(initialSnapshot?.hasCover);
  const displayUrl = filePreviewUrl ?? (!removeCover ? existingCoverUrl : null);
  const showImage = displayUrl != null && displayUrl !== '';
  const showBlurGlow = Boolean(showImage);
  const removalPending = removeCover && hasSavedCover;
  const showRemoveSaved =
    hasSavedCover && !coverFile && !removalPending && Boolean(existingCoverUrl);

  const songCount = draftTrackIds.length;

  return (
    <div className="relative mt-8 flex w-full flex-col gap-6 px-6">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:gap-8">
        <div className="relative flex shrink-0 flex-col items-center md:items-start">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setCoverFile(f);
            }}
          />
          {showBlurGlow && displayUrl ? (
            <img
              src={displayUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-48 scale-100 translate-y-4 rounded-2xl object-cover opacity-35 blur-lg saturate-150"
            />
          ) : null}
          <div className="relative shrink-0 pb-8">
            {showImage && displayUrl ? (
              <img
                src={displayUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 size-48 translate-y-3 scale-100 rounded-2xl object-cover opacity-35 blur-2xl saturate-150"
              />
            ) : null}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className={cn(
                'group relative z-[1] flex size-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 shadow-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                showImage
                  ? 'border-stone-700/70 bg-stone-900 hover:border-primary/45'
                  : removalPending
                    ? 'border-amber-500/30 bg-gradient-to-b from-amber-950/25 to-stone-950/60 hover:border-amber-400/45'
                    : 'border-dashed border-white/20 bg-gradient-to-b from-stone-900/50 to-stone-950/80 hover:border-primary/40 hover:from-stone-900/70',
              )}
            >
              {showImage && displayUrl ? (
                <>
                  <img
                    src={displayUrl}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition-opacity duration-200 group-hover:opacity-55"
                  />
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-stone-950/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <CameraIcon size={26} weight="duotone" className="text-white" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white">
                      Change
                    </span>
                  </div>
                </>
              ) : removalPending ? (
                <div className="relative z-[1] flex max-w-[11rem] flex-col items-center gap-2 px-3 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-100/90">
                    Removed when you save
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    Or tap to pick a new image
                  </span>
                </div>
              ) : (
                <div className="relative z-[1] flex flex-col items-center gap-2.5 px-4 text-center text-muted-foreground transition-colors group-hover:text-foreground">
                  <ImageIcon
                    size={32}
                    weight="duotone"
                    className="opacity-45 group-hover:opacity-75"
                  />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Add image</span>
                </div>
              )}
            </button>
          </div>
          {coverFile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setCoverFile(null);
                if (coverInputRef.current) coverInputRef.current.value = '';
              }}
            >
              Discard new image
            </Button>
          ) : null}
          {showRemoveSaved ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-red-400"
              onClick={scheduleRemoveCover}
            >
              <TrashIcon size={14} />
              Remove cover
            </Button>
          ) : null}
          {removalPending ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-8 text-xs"
              onClick={undoRemoveCover}
            >
              Undo remove
            </Button>
          ) : null}
        </div>

        <div className="w-full min-w-0 flex-1 pb-0 md:pb-2">
          <div className="flex flex-wrap items-center gap-x-2 text-xs font-semibold">
            <span className="text-primary tracking-widest uppercase">Playlist</span>
            <span className="text-stone-500" aria-hidden="true">
              -
            </span>
            <span className="text-muted-foreground">
              {songCount} {songCount === 1 ? 'song' : 'songs'}
            </span>
          </div>
        </div>
      </div>

      <TextField
        label="Title"
        placeholder="My playlist"
        value={draftName}
        error={titleError ?? undefined}
        onChange={setDraftName}
        onBlur={() => {}}
        className="w-full max-w-2xl"
      />
    </div>
  );
}
