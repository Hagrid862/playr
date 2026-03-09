import { Button } from '@/components/ui/button';
import { CircleNotchIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

interface BulkTrackActionsProps {
  tracksCount: number;
  isLoading: boolean;
  hasInvalidTracks: boolean;
}

export function BulkTrackActions({
  tracksCount,
  isLoading,
  hasInvalidTracks,
}: BulkTrackActionsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Button asChild variant="secondary" type="button" className="min-w-32">
        <Link to="..">Cancel</Link>
      </Button>
      <Button
        type="submit"
        disabled={hasInvalidTracks || isLoading || tracksCount === 0}
        className="min-w-32"
      >
        {isLoading ? (
          <>
            <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <UploadSimpleIcon className="mr-2 h-4 w-4" />
            Upload {tracksCount} track{tracksCount !== 1 ? 's' : ''}
          </>
        )}
      </Button>
    </div>
  );
}
