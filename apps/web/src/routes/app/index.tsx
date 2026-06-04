import { createFileRoute } from '@tanstack/react-router';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';
import { Home } from '@/components/app/Home';

export const Route = createFileRoute('/app/')({
  component: App,
  staticData: {
    title: 'Home',
    description: 'Welcome to Playr',
  },
});

function App() {
  usePersistentNavigation('home', '/app');
  return <Home />;
}
