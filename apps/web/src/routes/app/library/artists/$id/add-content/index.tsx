import { DiscIcon, ListBulletsIcon, MusicNoteIcon, MusicNotesIcon } from '@phosphor-icons/react';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/$id/add-content/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  const options = [
    {
      to: '/app/library/artists/$id/add-content/album' as const,
      title: 'Album',
      description:
        "A comprehensive full-length body of work. Typically includes 7 or more tracks or runs longer than 30 minutes. It's the primary format for artistic storytelling and major studio releases.",
      icon: DiscIcon,
    },
    {
      to: '/app/library/artists/$id/add-content/ep' as const,
      title: 'EP',
      description:
        'Extended Play. A mid-length collection, usually featuring 4 to 6 tracks. Perfect for thematic explorations or transitionary releases that are more substantial than a single but more concise than a full album.',
      icon: MusicNotesIcon,
    },
    {
      to: '/app/library/artists/$id/add-content/single' as const,
      title: 'Single',
      description:
        'A focused release centered around one or two key tracks. Often used for radio hits, remixes, or standalone singles. Usually contains fewer than 4 tracks and a total runtime under 15 minutes.',
      icon: MusicNoteIcon,
    },
    {
      to: '/app/library/artists/$id/add-content/compilation' as const,
      title: 'Compilation',
      description:
        'A curated assembly of tracks often spanning different eras, live recordings, or "best-of" selections. It serves to consolidate various works into a single meaningful collection for listeners.',
      icon: ListBulletsIcon,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 max-w-6xl mx-auto">
      {options.map((option) => (
        <Link
          key={option.title}
          to={option.to}
          params={{ id }}
          className="group relative p-2 rounded-lg transition-all transition-150 transform hover:scale-[1.02] active:scale-[1.00] hover:bg-stone-800/30 active:bg-stone-800/45 cursor-pointer"
        >
          <div className="aspect-square w-full overflow-hidden bg-stone-800 rounded-md flex items-center justify-center transition-colors group-hover:bg-stone-700/50">
            <option.icon
              className="size-1/3 text-stone-400 group-hover:text-primary transition-colors"
              weight="duotone"
            />
          </div>
          <div className="pt-4">
            <h3 className="line-clamp-1 text-sm font-semibold group-hover:text-white transition-colors">
              {option.title}
            </h3>
            <p className="line-clamp-8 text-xs text-muted-foreground leading-normal transition-colors group-hover:text-stone-300">
              {option.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
