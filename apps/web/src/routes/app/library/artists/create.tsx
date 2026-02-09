import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePrivateProfile } from '@/hooks/api/private-profile';
import { useLibraryStore } from '@/stores/library.store';
import { CameraIcon, InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/create')({
  component: RouteComponent,
});

function RouteComponent() {
  const { libraryId, privateAccountId } = useLibraryStore();
  const { mutate: createProfile, isPending: isCreatingProfile } = useCreatePrivateProfile();

  const handleCreateProfile = () => {
    createProfile();
  };

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col gap-4 max-w-4xl">
        {(!libraryId || !privateAccountId) && (
          <Alert variant="destructive">
            <WarningCircleIcon />
            <AlertTitle>You cannot create local artist right now.</AlertTitle>
            <AlertDescription>
              <div>
                <div className="mb-2">
                  You need to have a private profile to be able to create and manage any local
                  content. You can create it using button bellow.
                </div>
                <Button
                  variant="outline"
                  className="text-white"
                  onClick={handleCreateProfile}
                  disabled={isCreatingProfile}
                >
                  {isCreatingProfile ? 'Creating...' : 'Create private account'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        <Alert>
          <InfoIcon />
          <AlertTitle>You are about to create new local artist</AlertTitle>
          <AlertDescription>
            Local artist is only visible to you. It is bounded strictly to your private library and
            used to organize your custom music, like from CD&apos;s and other media sources. If you
            want to create a community artist profile, please use our artist application.
          </AlertDescription>
        </Alert>
        <Separator />
        <div className="flex gap-8">
          <div className="flex flex-col gap-2">
            <div className="w-42 h-42 rounded-full bg-stone-700 flex items-center justify-center">
              <CameraIcon size={72} className="text-stone-200" />
            </div>
            <div className="text-center">Artist avatar</div>
          </div>
          <div className="w-full">
            <FieldSet>
              <Field>
                <FieldLabel>
                  <Label>Artist name</Label>
                </FieldLabel>
                <FieldContent>
                  <Input placeholder="Kurt Cobain" />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>
                  <Label>Description</Label>
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    className="min-h-24"
                    placeholder="Kurt Cobain was Nirvana's iconic frontman who defi..."
                  />
                </FieldContent>
              </Field>
            </FieldSet>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <Button variant="outline">Cancel</Button>
          <Button disabled={!libraryId || !privateAccountId}>Create artist</Button>
        </div>
      </div>
    </div>
  );
}
