import LandingPage from '@/components/landingPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    return <LandingPage />;
  }

  return <div className="text-center">Hello world!</div>;
}
