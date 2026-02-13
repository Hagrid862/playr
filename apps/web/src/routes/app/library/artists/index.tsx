import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="">
      <p className="text-muted-foreground">List of artists will appear here.</p>
    </div>
  );
}
