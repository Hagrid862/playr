import LandingPage from '@/components/landingPage';
import { useAuthStore } from '@/stores/auth.store';
import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  const { accessToken, user } = useAuthStore();

  if (accessToken) {
    return <Navigate to="/app" />;
  } else if (!accessToken && user) {
    return <Navigate to="/auth/verify-email" search={{ email: user.emailAddresses?.[0]?.email ?? '' }} />;
  }

  return <LandingPage />;
}
