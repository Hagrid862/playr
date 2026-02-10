import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useLibraryStore } from '@/stores/library.store';
import { DotsThreeIcon, HeartIcon, PlayIcon, ShuffleIcon, UserIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const artist = useLibraryStore((state) => state.privateArtists.find((a) => a.id === id));

  if (!artist) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-full pb-8">
      {/* Banner Area */}
      <div className="relative w-full px-2 mt-4">
        {/* Banner with glass effect or premium stone look */}
        <div className="h-64 w-full bg-stone-900/40 rounded-2xl shadow-sm border border-border/50 overflow-hidden relative group">
          {artist.bannerId ? (
            <img
              src={`/api/images/${artist.bannerId}`}
              alt="Banner"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            />
          ) : (
            <div className="size-full bg-linear-to-br from-stone-900 via-stone-950 to-neutral-900 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background/80 to-transparent" />
        </div>

        {/* Avatar & Quick Info */}
        <div className="px-6 -mt-24 flex flex-col md:flex-row items-end gap-6 relative z-10">
          {/* Avatar */}
          <div className="size-44 p-1 rounded-2xl bg-background shadow-2xl shrink-0">
            <div className="size-full rounded-xl overflow-hidden bg-stone-800 flex items-center justify-center border border-border">
              {artist.avatarId ? (
                <img
                  src={`/api/images/${artist.avatarId}`}
                  alt={artist.name}
                  className="size-full object-cover"
                />
              ) : (
                <UserIcon className="size-1/2 text-stone-400" weight="duotone" />
              )}
            </div>
          </div>

          <div className="flex-1 pb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              {artist.isCommunity ? 'Community Artist' : 'Private Artist'}
            </p>
            <h2 className="text-2xl font-bold text-white opacity-90">{artist.name}</h2>
          </div>
        </div>
      </div>

      {/* Actions & Content */}
      <div className="px-2 mt-12 flex flex-col gap-8">
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="h-12 rounded-xl gap-2 px-8 text-base font-bold shadow-md hover:shadow-primary/20 active:shadow-primary/35 active:scale-98 transition-all bg-primary text-primary-foreground"
          >
            <PlayIcon weight="fill" size={20} /> Play
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-xl gap-2 px-8 text-base font-bold border-border bg-stone-900/20 backdrop-blur-md hover:bg-stone-800/40 active:scale-98 transition-all"
          >
            <ShuffleIcon weight="bold" size={20} /> Shuffle
          </Button>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            >
              <HeartIcon size={24} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                >
                  <DotsThreeIcon size={24} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator className="opacity-50" />
      </div>
    </div>
  );
}
