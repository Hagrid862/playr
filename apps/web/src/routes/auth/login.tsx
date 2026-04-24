import { LoginForm } from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLogin } from '@/hooks/api/auth';
import { useLoginForm } from '@/hooks/forms/useLoginForm';
import { useAuthStore } from '@/stores/auth.store';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { SyntheticEvent } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/auth/login')({
  component: RouteComponent,
});

export function RouteComponent() {
  const navigate = useNavigate();
  const { mutateAsync: loginUser, isPending: isLoading } = useLogin();
  const { formData, isFormValid, handleChange, handleBlur, handleSubmit, getFieldError } =
    useLoginForm();

  const onSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = handleSubmit();
    if (data) {
      try {
        const response = await loginUser(data);

        //different paths based on whether user primary email is verified
        if (response.data.outcome === 'authenticated') {
          // Persist auth data using store
          useAuthStore.getState().setAuth(response.data.user, response.data.accessToken);

          await navigate({ to: '/' });
        } else if (response.data.outcome === 'unauthenticated') {
          useAuthStore.getState().setUnauthenticatedUser(response.data.user);

          await navigate({
            to: '/auth/verify-email',
            search: { email: response.data.user.emailAddresses[0].email },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Registration failed', err);
        toast.error(message);
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full justify-center bg-background">
      <div className="flex w-full max-w-480 flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Login to your account</CardTitle>
            <CardDescription className="py-2">
              Welcome back! Please enter your credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              formData={formData}
              isLoading={isLoading}
              isValid={isFormValid}
              onSubmit={onSubmit}
              onChange={handleChange}
              onBlur={handleBlur}
              getFieldError={getFieldError}
            />
          </CardContent>
          {/* Footer is handled inside LoginForm for button, specific link for register below */}
        </Card>
        <Button asChild variant="link" color="primary" className="w-full mt-4">
          <Link to="/auth/register">Don&apos;t have an account? Sign up!</Link>
        </Button>
      </div>
    </div>
  );
}
