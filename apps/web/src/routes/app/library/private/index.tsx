import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/private/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (<SidebarLayout>
    <div>Private library page</div>
  </SidebarLayout>);
}