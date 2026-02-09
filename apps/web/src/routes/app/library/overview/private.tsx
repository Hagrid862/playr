import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/library/overview/private')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/library/overview/private"!</div>
}
