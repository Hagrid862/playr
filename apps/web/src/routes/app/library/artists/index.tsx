import { ArtistsListPage } from '@/components/library/artists/ArtistsListPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/')({
  component: ArtistsListPage,
});
