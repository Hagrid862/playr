import LandingPage from '@/components/landingPage';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { createFileRoute, useRouter } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.invalidate();
  };

  if (!accessToken) {
    return <LandingPage />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center p-4">
      <h1 className="text-2xl font-bold">Hello {user?.firstName || 'User'}!</h1>
      <div className="max-w-xl w-full bg-muted/50 p-4 rounded-lg text-left overflow-auto font-mono text-xs">
        <p className="font-bold mb-2">Debug Info:</p>
        <p className="mb-1">
          Logged in status: <span className="text-green-500">True</span>
        </p>
        <div className="break-all">
          <p className="font-semibold mt-2">Access Token:</p>
          <p className="opacity-70">{accessToken}</p>
        </div>
      </div>
      <Button onClick={handleLogout} variant="destructive">
        Logout
      </Button>
    </div>
  );
}
