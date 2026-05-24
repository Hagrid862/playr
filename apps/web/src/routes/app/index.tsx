import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/app/PageHeader';
import { SearchInput } from '@/components/search/SearchInput';

export const Route = createFileRoute('/app/')({
  component: App,
});

function App() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="Home" centerActions>
        <SearchInput className="max-w-xl" />
      </PageHeader>
    </div>
  );
}
