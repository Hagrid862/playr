import { RegisterForm } from '@/components/auth/RegisterForm';
import { RegisterWelcomePanel } from '@/components/auth/RegisterWelcomePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRegister } from '@/hooks/api/auth';
import { useRegisterForm } from '@/hooks/forms/useRegisterForm';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { type SyntheticEvent } from 'react';
import {useAuthStore} from "@/stores/auth.store";

export const Route = createFileRoute('/auth/register')({
  component: RouteComponent,
});

export function RouteComponent() {
  const navigate = useNavigate();
  const { mutateAsync: registerUser, isPending: isLoading } = useRegister();

  const {
    formData,
    errors,
    isFormValid,
    isPasswordFocused,
    showPasswordError,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldError,
    setIsPasswordFocused,
  } = useRegisterForm();

  const onSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = handleSubmit();
    if (data) {
      try {
        const response = await registerUser(data);

        useAuthStore.getState().setUnauthenticatedUser(response.data.user);

        await navigate({
          to: '/auth/verify-email',
        });

      } catch (err) {
        console.error('Registration failed', err);
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full justify-center bg-background px-4 py-8">
      <div className="flex w-full max-w-[1920px] flex-col items-center justify-center">
        <Card className="w-full max-w-md lg:max-w-4xl overflow-hidden pt-0 pb-0 gap-0">
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              <RegisterWelcomePanel />
              <Separator orientation="vertical" />

              {/* Form Panel */}
              <div className="lg:w-1/2 p-6">
                <CardHeader className="p-0 pb-4">
                  <CardTitle>Create an account</CardTitle>
                </CardHeader>
                <RegisterForm
                  id="register-form"
                  formData={formData}
                  isPasswordFocused={isPasswordFocused}
                  showPasswordError={showPasswordError}
                  passwordError={errors.password}
                  onSubmit={onSubmit}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  getFieldError={getFieldError}
                  setIsPasswordFocused={setIsPasswordFocused}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-t border-border/40 bg-muted/30">
            <Button
              form="register-form"
              type="submit"
              color="primary"
              className="w-full"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </CardFooter>
        </Card>
        <Button variant="link" color="primary" className="w-full mt-2" asChild>
          <Link to="/auth/login">Already have an account? Sign in!</Link>
        </Button>
      </div>
    </div>
  );
}
