import { CreateAlbumForm } from '@/components/library-albums/CreateAlbumForm';
import { Card } from '@/components/ui/card';
import { useCreateAlbumForm } from '@/hooks/forms/useCreateAlbumForm';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/app/library/artists/$id/add-content/album')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { formData, isFormValid, handleChange, handleBlur, handleSubmit, getFieldError } =
    useCreateAlbumForm(id);

  const handleFormSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const data = handleSubmit();
    if (!data) return;

    setIsLoading(true);
    try {
      // TODO: Implement actual API call here
      console.log('Submitting album:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock API delay
      await router.navigate({ to: '/app/library/artists/$id', params: { id } });
    } catch (error) {
      console.error('Failed to create album:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="overflow-hidden border-none shadow-xl bg-stone-900/40 backdrop-blur-md">
        <CreateAlbumForm
          formData={formData}
          isLoading={isLoading}
          isValid={isFormValid}
          onSubmit={handleFormSubmit}
          onChange={handleChange}
          onBlur={handleBlur}
          getFieldError={getFieldError}
        />
      </Card>
    </div>
  );
}
