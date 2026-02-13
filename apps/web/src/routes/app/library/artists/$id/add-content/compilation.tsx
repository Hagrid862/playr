import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/$id/add-content/compilation')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/app/library/artists/$id/add-content/compilation"!</div>;
}
