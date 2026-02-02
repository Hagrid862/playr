import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RegisterWelcomePanel } from '@/components/auth/RegisterWelcomePanel';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useRegisterForm } from '@/hooks/useRegisterForm';

export const Route = createFileRoute('/auth/register')({
  component: RouteComponent,
});

function RouteComponent() {
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

  const onSubmit = (e: React.FormEvent) => {
    const data = handleSubmit(e);
    if (data) {
      // TODO: Send request to API
      console.log('Form is valid, ready to submit:', data);
    }
  };

  return (
    <div className="min-w-screen min-h-screen flex flex-col items-center justify-center py-8 px-4">
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
            type="submit"
            color="primary"
            className="w-full"
            disabled={!isFormValid}
            onClick={onSubmit}
          >
            Create account
          </Button>
        </CardFooter>
      </Card>
      <Button variant="link" color="primary" className="w-full mt-2" asChild>
        <Link to="/auth/login">Already have an account? Sign in!</Link>
      </Button>
    </div>
  );
}
