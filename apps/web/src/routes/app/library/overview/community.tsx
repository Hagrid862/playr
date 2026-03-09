import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/overview/community')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello &quot;/app/library/overview/community&quot;!</div>;
}
