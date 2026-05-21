import { StarIcon } from '@phosphor-icons/react';

/** Filled star with diagonal stroke when every album track is in favorites; outline star otherwise. */
export function AlbumFavoriteStarGlyph({
  allInFavorites,
  menuSize = false,
}: {
  allInFavorites: boolean;
  /** Slightly smaller icon for context / dropdown rows */
  menuSize?: boolean;
}) {
  const px = menuSize ? 16 : 24;
  if (allInFavorites) {
    return (
      <span
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: px, height: px }}
      >
        <StarIcon size={px} weight="fill" className="text-emerald-400" />
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 h-[82%] w-[2.5px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-stone-950/90 shadow-[0_0_1px_rgba(255,255,255,0.4)]"
          aria-hidden
        />
      </span>
    );
  }
  return <StarIcon size={px} weight="regular" className="shrink-0" />;
}
