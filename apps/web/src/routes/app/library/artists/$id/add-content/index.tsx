import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/$id/add-content/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Link to="/app/library/artists/$id/add-content/album" params={{ id }}>
        <Card className="h-full hover:bg-stone-900/50 hover:scale-101 transition-all transition-150 active:scale-99 active:bg-stone-900/30 select-none cursor-pointer">
          <CardHeader>
            <CardTitle className="text-2xl mb-2">Album</CardTitle>
            <CardDescription>
              A comprehensive full-length body of work. Typically includes 7 or more tracks or runs
              longer than 30 minutes. It&apos;s the primary format for artistic storytelling and
              major studio releases.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
      <Link to="/app/library/artists/$id/add-content/ep" params={{ id }}>
        <Card className="h-full hover:bg-stone-900/50 hover:scale-101 transition-all transition-150 active:scale-99 active:bg-stone-900/30 select-none cursor-pointer">
          <CardHeader>
            <CardTitle className="text-2xl mb-2">EP</CardTitle>
            <CardDescription>
              Extended Play. A mid-length collection, usually featuring 4 to 6 tracks. Perfect for
              thematic explorations or transitionary releases that are more substantial than a
              single but more concise than a full album.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
      <Link to="/app/library/artists/$id/add-content/single" params={{ id }}>
        <Card className="h-full hover:bg-stone-900/50 hover:scale-101 transition-all transition-150 active:scale-99 active:bg-stone-900/30 select-none cursor-pointer">
          <CardHeader>
            <CardTitle className="text-2xl mb-2">Single</CardTitle>
            <CardDescription>
              A focused release centered around one or two key tracks. Often used for radio hits,
              remixes, or standalone singles. Usually contains fewer than 4 tracks and a total
              runtime under 15 minutes.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
      <Link to="/app/library/artists/$id/add-content/compilation" params={{ id }}>
        <Card className="h-full hover:bg-stone-900/50 hover:scale-101 transition-all transition-150 active:scale-99 active:bg-stone-900/30 select-none cursor-pointer">
          <CardHeader>
            <CardTitle className="text-2xl mb-2">Compilation</CardTitle>
            <CardDescription>
              A curated assembly of tracks often spanning different eras, live recordings, or
              &quot;best-of&quot; selections. It serves to consolidate various works into a single
              meaningful collection for listeners.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
