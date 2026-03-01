import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums/$id/add-content/bulk')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/app/library/albums/$id/add-content/bulk"!</div>;
}
