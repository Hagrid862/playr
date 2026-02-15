import { cn } from '@/lib/utils';
import { DiscIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

export function MediaCard({
  coverUrl,
  title,
  subtitle,
  id,
  link,
  coverStyle = 'square',
  placeholderIcon,
}: {
  coverUrl: string | undefined;
  title: string;
  subtitle: string | undefined;
  id: string;
  link: string;
  coverStyle?: 'circle' | 'square';
  placeholderIcon?: React.ReactNode;
}) {
  return (
    <Link
      key={id}
      to={link}
      params={{ id }}
      className="group/artist relative p-2 rounded-lg overflow-hidden transition-all transition-150 transform hover:scale-[1.02] active:scale-[1.00] hover:bg-stone-800/30 active:bg-stone-800/45 cursor-pointer"
    >
      <div
        className={cn(
          'aspect-square w-full overflow-hidden bg-stone-800',
          coverStyle === 'circle' ? 'rounded-full' : 'rounded',
        )}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            {placeholderIcon ?? <DiscIcon className="size-1/2 text-stone-400" weight="duotone" />}
          </div>
        )}
      </div>
      <div className="pt-4">
        <h3 className="line-clamp-1 text-sm font-semibold">{title}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{subtitle ?? 'Unknown'}</p>
      </div>
    </Link>
  );
}
