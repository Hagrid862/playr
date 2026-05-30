import { Spinner } from '@/components/ui/spinner';
import { useLibraryGenres } from '@/hooks/api/library-genres/useLibraryGenres';
import { createFileRoute } from '@tanstack/react-router';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

export const Route = createFileRoute('/app/library/genres/')({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    data: genresResponse,
    isLoading,
    error,
    isError,
  } = useLibraryGenres({ page: 1, limit: 100 });
  const genres = genresResponse?.data?.items || [];

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground animate-pulse">Fetching your genres...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl p-12 text-center backdrop-blur-sm">
        <h3 className="mb-2 text-xl font-semibold text-destructive">Failed to load genres</h3>
        <p className="text-muted-foreground">{error?.message || 'An unexpected error occurred.'}</p>
      </div>
    );
  }

  if (genres.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl p-12 text-center backdrop-blur-sm">
        <div className="mb-6 rounded-full bg-stone-800/50 p-6 ring-1 ring-white/5">
          <MagnifyingGlassIcon className="size-12 text-muted-foreground" weight="duotone" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">No genres found</h3>
        <p className="mb-8 max-w-sm text-muted-foreground leading-relaxed">
          Your private library is empty. Add your first genre to start organizing your personal
          collection.
        </p>
      </div>
    );
  }

  return null;
}
