import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/auth/login')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-w-screen min-h-screen flex flex-col items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2">
            <Field>
              <FieldLabel>Email</FieldLabel>
              <FieldContent>
                <Input type="email" />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Password</FieldLabel>
              <FieldContent>
                <Input type="password" />
              </FieldContent>
            </Field>
            <Button variant="link" color="primary" className="w-full justify-start">
              Forgot password?
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button type="submit" color="primary" className="w-full">
            Login
          </Button>
        </CardFooter>
      </Card>
      <Button variant="link" color="primary" className="w-full mt-2">
        <Link to="/auth/register">Don&apos;t have an account? Sign up!</Link>
      </Button>
    </div>
  );
}
