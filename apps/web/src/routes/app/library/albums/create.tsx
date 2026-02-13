import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums/create')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/app/library/album/create"!</div>;
}
