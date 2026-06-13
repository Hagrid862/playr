import { createFileRoute, Link } from '@tanstack/react-router';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';
import { SubHeader } from '@/components/app/SubHeader';
import { UsersThreeIcon, DiscIcon, PlaylistIcon } from '@phosphor-icons/react';

export const Route = createFileRoute('/app/new/')({
  component: RouteComponent,
});

function RouteComponent() {
  usePersistentNavigation('new', '/app/new');

  const items = [
    {
      title: 'Artist',
      description: 'Create a new artist profile for your library',
      icon: UsersThreeIcon,
      to: '/app/library/artists/create' as const,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'Album',
      description: 'Add a new album and upload your songs',
      icon: DiscIcon,
      to: '/app/library/albums/create' as const,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: 'Playlist',
      description: 'Create a custom collection of your favorite tracks',
      icon: PlaylistIcon,
      to: '/app/playlists/create' as const,
      color: 'bg-green-500/10 text-green-500',
    },
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <SubHeader title="Add New" />
      <div className="flex-1 p-6 md:p-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {items.map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className="flex flex-col items-center justify-center aspect-square rounded-lg bg-stone-900/40 border border-stone-800/60 hover:bg-stone-800/40 hover:border-stone-700 transition-all duration-300 group gap-8 text-center p-8 shadow-2xl hover:shadow-primary/5 hover:-translate-y-2"
            >
              <div
                className={`p-8 rounded-lg ${item.color} group-hover:scale-110 transition-transform duration-300 shadow-inner`}
              >
                <item.icon size={80} weight="duotone" />
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-3xl font-bold text-stone-100 group-hover:text-white transition-colors">
                  {item.title}
                </span>
                <span className="text-stone-400 text-base max-w-[240px] leading-relaxed">
                  {item.description}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
