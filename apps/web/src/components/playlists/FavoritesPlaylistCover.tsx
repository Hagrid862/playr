import { StarIcon } from '@phosphor-icons/react';

export function FavoritesPlaylistCover() {
  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-emerald-600/90 via-teal-700/90 to-stone-900">
      <StarIcon className="size-2/5 text-white drop-shadow-md" weight="fill" />
    </div>
  );
}
