import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/new/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SidebarLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold">New</h1>
        <p className="text-muted-foreground">Create something new.</p>
      </div>
    </SidebarLayout>
  );
}
