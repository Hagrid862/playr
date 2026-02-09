import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCreateLibrary, useLibrary } from '@/hooks/api/library';
import { ApiError } from '@/lib/api-error';
import { useLibraryStore } from '@/stores/library.store';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/overview/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: libraryResponse, isLoading, error } = useLibrary();
  const { mutate: createLibrary, isPending } = useCreateLibrary();
  const libraryId = useLibraryStore((state) => state.libraryId);

  const handleCreateLibrary = () => {
    createLibrary({});
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <Spinner className="size-8 text-primary" />
          <div className="animate-pulse text-muted-foreground text-lg">Loading your library...</div>
        </div>
      );
    }

    if (error) {
      if (error instanceof ApiError && error.status === 404) {
        return (
          <div className="flex flex-col items-center justify-center text-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                You don&apos;t have a private library yet.
              </h2>
              <p className="text-muted-foreground text-lg">
                Create one for free and start organizing your private collection.
              </p>
            </div>

            <Button
              size="lg"
              onClick={handleCreateLibrary}
              disabled={isPending}
              className="min-w-40 relative overflow-hidden"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  <span>Just a sec...</span>
                </div>
              ) : (
                'Create Library'
              )}
            </Button>
          </div>
        );
      }

      return (
        <div className="p-8 text-center text-destructive">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error.message}</p>
        </div>
      );
    }

    if (libraryResponse?.data) {
      return (
        <div className="p-8 text-center max-w-md mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-primary">Your Private Library</h2>
            <p className="text-muted-foreground text-lg">Welcome back to your collection.</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
            <p className="text-xs font-mono text-muted-foreground/70 break-all">
              Library ID: {libraryId}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      {renderContent()}
    </div>
  );
}
