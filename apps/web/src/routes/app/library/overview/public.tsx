import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/overview/public')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello &quot;/app/library/overview/public&quot;!</div>;
}
