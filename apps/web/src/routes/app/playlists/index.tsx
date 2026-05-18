import { PlaylistLibraryCard } from '@/components/playlists/PlaylistLibraryCard';
import { Spinner } from '@/components/ui/spinner';
import { useLibraryPlaylists } from '@/hooks/api/library-playlists/useLibraryPlaylists';
import { PlaylistIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/playlists/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = useLibraryPlaylists();
  const items = data?.data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading playlists…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl p-12 text-center backdrop-blur-sm">
        <div className="mb-6 rounded-full bg-stone-800/50 p-6 ring-1 ring-white/5">
          <PlaylistIcon className="size-12 text-muted-foreground" weight="duotone" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">No playlists yet</h3>
        <p className="mb-2 max-w-sm text-muted-foreground leading-relaxed">
          Create a playlist from the button above, or favorite songs from the player.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {items.map((p) => (
          <PlaylistLibraryCard key={p.id} playlist={p} />
        ))}
      </div>
    </div>
  );
}
