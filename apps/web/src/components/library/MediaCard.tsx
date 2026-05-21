import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { DiscIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export function MediaCard({
  coverUrl,
  title,
  subtitle,
  id,
  link,
  coverStyle = 'square',
  placeholderIcon,
  coverSlot,
  routeParams,
  contextMenu,
}: {
  coverUrl: string | undefined;
  title: string;
  subtitle: string | undefined;
  id: string;
  link: string;
  coverStyle?: 'circle' | 'square';
  placeholderIcon?: ReactNode;
  /** When set, replaces the default cover image / placeholder area. */
  coverSlot?: ReactNode;
  /** Route params for `to` (defaults to `{ id }`). */
  routeParams?: Record<string, string>;
  /** Right-click menu content (wrapped in `ContextMenuContent`). */
  contextMenu?: ReactNode;
}) {
  const params = routeParams ?? { id };
  const linkEl = (
    <Link
      to={link}
      params={params}
      className="group/artist relative block p-2 rounded-lg overflow-hidden transition-all transition-150 transform hover:scale-[1.02] active:scale-[1.00] hover:bg-stone-800/30 active:bg-stone-800/45 cursor-pointer"
    >
      <div
        className={cn(
          'aspect-square w-full overflow-hidden bg-stone-800',
          coverStyle === 'circle' ? 'rounded-full' : 'rounded',
        )}
      >
        {coverSlot ? (
          coverSlot
        ) : coverUrl ? (
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

  if (!contextMenu) {
    return linkEl;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{linkEl}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">{contextMenu}</ContextMenuContent>
    </ContextMenu>
  );
}
