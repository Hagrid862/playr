import { SubHeader } from '@/components/app/SubHeader';
import { createFileRoute } from '@tanstack/react-router';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';

export const Route = createFileRoute('/app/')({
  component: App,
  staticData: {
    title: 'Home',
    description: 'Welcome to Playr',
  },
});

function App() {
  usePersistentNavigation('home', '/app');
  return (
    <div className="flex flex-col gap-4">
      <SubHeader title="Home" />
      <div className="p-4">{/* Home content */}</div>
    </div>
  );
}
