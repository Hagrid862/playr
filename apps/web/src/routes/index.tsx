import LandingPage from '@/components/landingPage';
import { useAuthStore } from '@/stores/auth.store';
import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  const { accessToken } = useAuthStore();

  if (accessToken) {
    return <Navigate to="/app" />;
  }

  return <LandingPage />;
}
