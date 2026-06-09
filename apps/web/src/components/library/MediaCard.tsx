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
  subtitleAlign = 'left',
  onClick,
  as = 'link',
}: {
  coverUrl: string | undefined;
  title: string;
  subtitle: ReactNode;
  id: string;
  link: string;
  coverStyle?: 'circle' | 'square';
  subtitleAlign?: 'left' | 'right';
  placeholderIcon?: ReactNode;
  /** When set, replaces the default cover image / placeholder area. */
  coverSlot?: ReactNode;
  /** Route params for `to` (defaults to `{ id }`). */
  routeParams?: Record<string, string>;
  /** Right-click menu content (wrapped in `ContextMenuContent`). */
  contextMenu?: ReactNode;
  /** Custom click handler for the card. */
  onClick?: (e: React.MouseEvent) => void;
  /** Whether to render as a Link or a div. Defaults to 'link'. */
  as?: 'link' | 'div';
}) {
  const params = routeParams ?? { id };
  const className =
    'group/artist relative block p-2 rounded-lg overflow-hidden transition-all transition-150 transform hover:scale-[1.02] active:scale-[1.00] hover:bg-stone-800/30 active:bg-stone-800/45 cursor-pointer';

  const content = (
    <>
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
        <div
          className={cn(
            'line-clamp-1 text-xs text-muted-foreground',
            subtitleAlign === 'right' ? 'text-right' : 'text-left',
          )}
        >
          {subtitle ?? 'Unknown'}
        </div>
      </div>
    </>
  );

  const linkEl =
    as === 'link' ? (
      <Link key={id} to={link} params={params} onClick={onClick} className={className}>
        {content}
      </Link>
    ) : (
      <div key={id} onClick={onClick} className={className}>
        {content}
      </div>
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
