import { createFileRoute } from '@tanstack/react-router';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';

export const Route = createFileRoute('/app/new/')({
  component: RouteComponent,
});

function RouteComponent() {
  usePersistentNavigation('new', '/app/new');
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">New</h1>
      <p className="text-muted-foreground">Create something new.</p>
    </div>
  );
}
