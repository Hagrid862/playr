import { PlayIcon } from '@phosphor-icons/react';

interface Artist {
  id: string;
  name: string;
}

interface SongCardProps {
  trackNumber: number;
  title: string;
  artists?: Artist[];
  duration: number;
  explicit?: boolean;
  onClick?: () => void;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function SongCard({
  trackNumber,
  title,
  artists,
  duration,
  explicit,
  onClick,
}: SongCardProps) {
  return (
    <div
      onClick={onClick}
      className="group grid grid-cols-[3rem_1fr_auto] gap-4 items-center px-4 py-3 rounded-xl hover:bg-stone-900/40 transition-all cursor-pointer active:scale-[0.99]"
    >
      <div className="text-center text-sm font-bold text-stone-500 group-hover:text-primary transition-colors">
        <span className="group-hover:hidden">{trackNumber}</span>
        <PlayIcon className="hidden group-hover:block mx-auto" weight="fill" size={16} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-bold text-stone-200 group-hover:text-white truncate text-base">
            {title}
          </div>
          {explicit && (
            <span className="flex items-center justify-center size-3.5 bg-stone-500 text-[10px] font-bold text-stone-950 rounded-[2px] shrink-0 translate-y-px">
              E
            </span>
          )}
        </div>
        {artists && artists.length > 0 && (
          <div className="text-xs font-medium text-stone-500 group-hover:text-stone-400">
            {artists.map((a) => a.name).join(', ')}
          </div>
        )}
      </div>

      <div className="text-sm font-bold text-stone-500 tabular-nums group-hover:text-stone-300">
        {formatDuration(duration)}
      </div>
    </div>
  );
}
