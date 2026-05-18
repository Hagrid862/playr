import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CameraIcon, ImageIcon, TrashIcon } from '@phosphor-icons/react';
import type { RefObject } from 'react';

export type PlaylistFormCoverProps = {
  id: string;
  coverInputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  displayUrl: string | null;
  hasSavedCover: boolean;
  removalPending: boolean;
  hasNewFile: boolean;
  onPickFiles: (file: File | null) => void;
  onDiscardNewFile: () => void;
  onScheduleRemoveSavedCover?: () => void;
  onUndoRemoval?: () => void;
};

export function PlaylistFormCover({
  id,
  coverInputRef,
  disabled,
  displayUrl,
  hasSavedCover,
  removalPending,
  hasNewFile,
  onPickFiles,
  onDiscardNewFile,
  onScheduleRemoveSavedCover,
  onUndoRemoval,
}: PlaylistFormCoverProps) {
  const showImage = displayUrl != null && displayUrl !== '';

  const showRemoveSaved =
    hasSavedCover && !hasNewFile && !removalPending && onScheduleRemoveSavedCover != null;
  const showUndo = removalPending && onUndoRemoval != null;
  const hasActionRow = hasNewFile || showRemoveSaved || showUndo;

  return (
    <div
      className={cn(
        'w-full rounded-xl border border-border/55 bg-muted/20 p-5 shadow-sm sm:p-6',
        'ring-1 ring-inset ring-white/[0.04]',
      )}
    >
      <div className="flex w-full flex-col gap-4">
        <div className="text-left">
          <Label htmlFor={id} className="text-sm font-medium">
            Cover
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">Optional · square images look best</p>
        </div>

        <input
          ref={coverInputRef}
          id={id}
          type="file"
          accept="image/*"
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onPickFiles(f);
          }}
        />

        {/* Padding below so the blurred glow (translate-y) is not clipped */}
        <div className="flex w-full justify-center pt-0.5 sm:justify-start">
          <div className="relative w-fit shrink-0 pb-10 sm:pb-8">
            {showImage ? (
              <img
                src={displayUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 size-48 translate-y-3 scale-100 rounded-2xl object-cover opacity-35 blur-2xl saturate-150"
              />
            ) : null}

            <button
              type="button"
              disabled={disabled}
              onClick={() => coverInputRef.current?.click()}
              className={cn(
                'group relative z-[1] flex size-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 shadow-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
                showImage
                  ? 'border-stone-700/70 bg-stone-900 hover:border-primary/45'
                  : removalPending
                    ? 'border-amber-500/30 bg-gradient-to-b from-amber-950/25 to-stone-950/60 hover:border-amber-400/45'
                    : 'border-dashed border-white/20 bg-gradient-to-b from-stone-900/50 to-stone-950/80 hover:border-primary/40 hover:from-stone-900/70',
              )}
            >
              {showImage ? (
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
        </div>

        {hasActionRow ? (
          <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-border/45 pt-4 sm:justify-start">
            {hasNewFile ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={onDiscardNewFile}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Discard new image
              </Button>
            ) : null}
            {showRemoveSaved ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={onScheduleRemoveSavedCover}
                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-red-400"
              >
                <TrashIcon size={14} />
                Remove cover
              </Button>
            ) : null}
            {showUndo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={onUndoRemoval}
                className="h-8 text-xs"
              >
                Undo remove
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
