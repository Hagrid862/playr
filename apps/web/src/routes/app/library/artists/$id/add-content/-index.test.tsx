import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtistAddContentCreateAlbumView } from './index';

vi.mock('@/components/library/albums/create/LibraryAlbumFromFilesForm', () => ({
  LibraryAlbumFromFilesForm: ({
    cancelTo,
    initialArtistId,
  }: {
    cancelTo: string;
    initialArtistId?: string;
  }) => (
    <div
      data-testid="library-album-from-files-form"
      data-cancel-to={cancelTo}
      data-initial-artist-id={initialArtistId ?? ''}
    />
  ),
}));

const mockUseLibraryStore = vi.fn();
vi.mock('@/stores/library.store', () => ({
  useLibraryStore: (selector: (state: { libraryId: string | null }) => unknown) =>
    mockUseLibraryStore(selector),
}));

describe('ArtistAddContentCreateAlbumView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLibraryStore.mockImplementation((selector) => selector({ libraryId: 'lib-1' }));
  });

  it('renders create album guidance and passes artist id and cancel path to the form', () => {
    customRender(<ArtistAddContentCreateAlbumView artistId="artist-xyz" />);

    expect(screen.getByText('Create album with tracks')).toBeInTheDocument();
    const form = screen.getByTestId('library-album-from-files-form');
    expect(form).toHaveAttribute('data-initial-artist-id', 'artist-xyz');
    expect(form).toHaveAttribute('data-cancel-to', '/app/library/artists/artist-xyz');
  });

  it('shows library unavailable when libraryId is missing', () => {
    mockUseLibraryStore.mockImplementation((selector) => selector({ libraryId: null }));

    customRender(<ArtistAddContentCreateAlbumView artistId="a1" />);

    expect(screen.getByText('Library unavailable')).toBeInTheDocument();
  });
});
