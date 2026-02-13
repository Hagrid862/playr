import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/overview/private')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* We'll add content here in future tasks */}
        <div className="aspect-video rounded-xl bg-stone-900/50 border border-border/50 flex items-center justify-center">
          <p className="text-muted-foreground italic">No content in your private library yet.</p>
        </div>
      </div>
    </div>
  );
}
