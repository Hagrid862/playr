import { AlbumsListPage } from '@/components/library/albums/AlbumsListPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums/')({
  component: AlbumsListPage,
});
