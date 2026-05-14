import { createFileRoute } from '@tanstack/react-router';
import { useIsMobile } from '@/hooks/use-mobile';
import { MusicNotesIcon } from '@phosphor-icons/react';

export const Route = createFileRoute('/app/library/genres/')({
  component: GenresIndex,
});

function GenresIndex() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return null; // The layout handles the list view
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/50 text-accent-foreground">
        <MusicNotesIcon size={40} weight="duotone" />
      </div>
      <h2 className="text-2xl font-bold">Select a Genre</h2>
      <p className="mt-2 max-w-xs text-muted-foreground">
        Pick a genre from the list on the left to see your albums and songs.
      </p>
    </div>
  );
}
