import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Button } from '@/components/ui/button';
import { useLibrary } from '@/hooks/api/library';
import { ApiError } from '@/lib/api-error';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/private/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: libraryResponse, isLoading, error } = useLibrary();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-pulse text-muted-foreground text-lg">Loading your library...</div>
        </div>
      );
    }

    if (error) {
      if (error instanceof ApiError && error.status === 404) {
        return (
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">You don&apos;t have a private library yet.</h2>
              <p className="text-muted-foreground text-lg">Create one for free and start organizing your private collection.</p>
            </div>
            <Button size="lg">
              Create Library
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
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2 text-primary">Library Exists</h2>
          <p className="text-muted-foreground">Welcome back to your private collection.</p>
          <p className="mt-4 text-xs font-mono text-muted-foreground/50">ID: {libraryResponse.data.id}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <SidebarLayout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        {renderContent()}
      </div>
    </SidebarLayout>
  );
}
