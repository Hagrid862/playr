import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="">
      <PageHeader
        title="Artists"
        actions={
          <Button variant="outline">
            <PlusIcon />
            Add Artist
          </Button>
        }
      />
    </div>
  );
}
