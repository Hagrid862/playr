import { Button } from '@/components/ui/button';
import { useCreatePrivateProfile, usePrivateProfile } from '@/hooks/api/private-profile';
import { Lock, Sparkle } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/overview/private')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: privateProfile, isLoading } = usePrivateProfile();
  const { mutate: createProfile, isPending: isCreating } = useCreatePrivateProfile();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-muted-foreground animate-pulse">Loading your profile...</p>
      </div>
    );
  }

  if (!privateProfile?.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center bg-stone-900/50 rounded-2xl border border-dashed border-border/50 backdrop-blur-sm">
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full" />
          <div className="relative bg-stone-950 p-6 rounded-2xl border border-primary/20 shadow-2xl">
            <Lock className="h-12 w-12 text-primary" weight="duotone" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2 bg-linear-to-br from-white to-stone-400 bg-clip-text text-transparent">
          Private Library Locked
        </h2>
        <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
          Your private library is a dedicated space for your personal collection. To access it, you
          first need to create your private profile.
        </p>
        <Button
          size="lg"
          onClick={() => createProfile()}
          disabled={isCreating}
          className="relative group px-8"
        >
          <Sparkle className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
          {isCreating ? 'Creating Profile...' : 'Create Private Profile'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* We'll add content here in future tasks */}
        <div className="aspect-video rounded-xl bg-stone-900/50 border border-border/50 flex items-center justify-center">
          <p className="text-muted-foreground italic">No content in your private library yet.</p>
        </div>
      </div>
    </div>
  );
}
