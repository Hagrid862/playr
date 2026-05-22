import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddAlbumToPlaylistSubmenu } from './AddAlbumToPlaylistSubmenu';
import { PlaylistSystemRole } from '@repo/db';
import type { GetLibraryPlaylistsResponse, LibraryPlaylistListItem } from '@repo/contracts';
import { imageBuilder } from '@repo/testing';

const addAlbumMock = vi.fn();
const createPlaylistMock = vi.fn();

const testMeta: GetLibraryPlaylistsResponse['meta'] = {
  timestamp: '2020-01-01T00:00:00.000Z',
  requestId: 'req-test',
  path: '/library/playlists',
};

function playlistListItem(
  overrides: Pick<LibraryPlaylistListItem, 'id' | 'name'> &
    Partial<Omit<LibraryPlaylistListItem, 'id' | 'name'>>,
): LibraryPlaylistListItem {
  return {
    systemRole: null,
    pinned: false,
    pinOrder: null,
    pinId: null,
    cover: null,
    trackCount: 1,
    ...overrides,
  };
}

function defaultPlaylistsResponse(): GetLibraryPlaylistsResponse {
  return {
    success: true,
    data: {
      items: [
        playlistListItem({
          id: 'playlist-favorites',
          name: 'My Favorites',
          systemRole: PlaylistSystemRole.favorites,
        }),
        playlistListItem({
          id: 'playlist-custom-cover',
          name: 'Chill Mix',
          cover: imageBuilder({ url: 'https://example.com/chill.jpg' }),
        }),
        playlistListItem({
          id: 'playlist-no-cover',
          name: 'Rock Vibes',
        }),
      ],
    },
    error: null,
    meta: testMeta,
  };
}

const mockPlaylists: { current: GetLibraryPlaylistsResponse | null } = {
  current: defaultPlaylistsResponse(),
};

vi.mock('@/hooks/api/library-playlists', () => ({
  useLibraryPlaylists: () => ({ data: mockPlaylists.current }),
  useAddPlaylistAlbum: () => ({ mutateAsync: addAlbumMock, isPending: false }),
  useCreateLibraryPlaylist: () => ({ mutateAsync: createPlaylistMock, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) =>
    open ? (
      <div data-testid="mock-dialog">
        <button type="button" data-testid="close-dialog-btn" onClick={() => onOpenChange?.(false)}>
          Close
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: PropsWithChildren) => (
    <h2 data-testid="mock-dialog-title">{children}</h2>
  ),
  DialogFooter: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-dialog-footer">{children}</div>
  ),
}));

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenuItem: ({ children, onClick, disabled }: ComponentPropsWithoutRef<'button'>) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ContextMenuPortal: ({ children }: PropsWithChildren) => <>{children}</>,
  ContextMenuSeparator: () => <hr data-testid="menu-separator" />,
  ContextMenuSub: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-context-sub">{children}</div>
  ),
  ContextMenuSubContent: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-context-sub-content">{children}</div>
  ),
  ContextMenuSubTrigger: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-context-sub-trigger">{children}</div>
  ),
}));

vi.mock('@/components/playlists/FavoritesPlaylistCover', () => ({
  FavoritesPlaylistCover: () => <div data-testid="favorites-cover" />,
}));

import { toast } from 'sonner';

describe('AddAlbumToPlaylistSubmenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlaylists.current = defaultPlaylistsResponse();
  });

  it('renders context menu items properly with system roles and custom covers', () => {
    const { container } = customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    expect(screen.getByText('Add to playlist')).toBeInTheDocument();
    expect(screen.getByText('My Favorites')).toBeInTheDocument();
    expect(screen.getByText('Chill Mix')).toBeInTheDocument();
    expect(screen.getByText('Rock Vibes')).toBeInTheDocument();

    // Favorites covers
    expect(screen.getByTestId('favorites-cover')).toBeInTheDocument();

    // Custom cover img
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/chill.jpg');
  });

  it('handles empty playlists items array safely', () => {
    mockPlaylists.current = null;
    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);
    expect(screen.queryByText('My Favorites')).not.toBeInTheDocument();
  });

  it('adds album to playlist successfully (all tracks already in)', async () => {
    addAlbumMock.mockResolvedValueOnce({
      data: { addedCount: 0, trackCount: 5 },
    });

    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const itemBtn = screen.getByRole('button', { name: /Chill Mix/i });
    fireEvent.click(itemBtn);

    await waitFor(() => {
      expect(addAlbumMock).toHaveBeenCalledWith({
        playlistId: 'playlist-custom-cover',
        body: { albumId: 'album-123' },
      });
      expect(toast.success).toHaveBeenCalledWith(
        'All tracks from this album were already in the playlist',
      );
    });
  });

  it('adds album to playlist successfully (all tracks added)', async () => {
    addAlbumMock.mockResolvedValueOnce({
      data: { addedCount: 5, trackCount: 5 },
    });

    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const itemBtn = screen.getByRole('button', { name: /Chill Mix/i });
    fireEvent.click(itemBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Added album to playlist');
    });
  });

  it('adds album to playlist successfully (partial tracks added)', async () => {
    addAlbumMock.mockResolvedValueOnce({
      data: { addedCount: 3, trackCount: 5 },
    });

    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const itemBtn = screen.getByRole('button', { name: /Chill Mix/i });
    fireEvent.click(itemBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Added 5 songs (3 new)');
    });
  });

  it('handles album addition failure correctly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    addAlbumMock.mockRejectedValueOnce(new Error('Add failure'));

    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const itemBtn = screen.getByRole('button', { name: /Chill Mix/i });
    fireEvent.click(itemBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not add album to playlist');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });

  it('opens dialog, validates empty name, and closes it', async () => {
    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const newBtn = screen.getByRole('button', { name: /New playlist…/i });
    fireEvent.click(newBtn);

    expect(screen.getByTestId('mock-dialog')).toBeInTheDocument();

    const createBtn = screen.getByRole('button', { name: /Create & add/i });
    fireEvent.click(createBtn);

    expect(toast.error).toHaveBeenCalledWith('Enter a name');

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();
  });

  it('creates playlist and adds album successfully (all tracks already in)', async () => {
    createPlaylistMock.mockResolvedValueOnce({ data: { id: 'new-p-1' } });
    addAlbumMock.mockResolvedValueOnce({ data: { addedCount: 0, trackCount: 4 } });

    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const newBtn = screen.getByRole('button', { name: /New playlist…/i });
    fireEvent.click(newBtn);

    const input = screen.getByPlaceholderText('Playlist name');
    fireEvent.change(input, { target: { value: 'My Brand New Playlist' } });

    const createBtn = screen.getByRole('button', { name: /Create & add/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(createPlaylistMock).toHaveBeenCalledWith({ name: 'My Brand New Playlist' });
      expect(addAlbumMock).toHaveBeenCalledWith({
        playlistId: 'new-p-1',
        body: { albumId: 'album-123' },
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Playlist created. All tracks from this album were already in the playlist.',
      );
      expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();
    });
  });

  it('creates playlist and adds album successfully (all tracks added)', async () => {
    createPlaylistMock.mockResolvedValueOnce({ data: { id: 'new-p-1' } });
    addAlbumMock.mockResolvedValueOnce({ data: { addedCount: 4, trackCount: 4 } });

    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const newBtn = screen.getByRole('button', { name: /New playlist…/i });
    fireEvent.click(newBtn);

    const input = screen.getByPlaceholderText('Playlist name');
    fireEvent.change(input, { target: { value: 'My Brand New Playlist' } });

    const createBtn = screen.getByRole('button', { name: /Create & add/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Playlist created and album added');
    });
  });

  it('creates playlist and adds album successfully (partial tracks added)', async () => {
    createPlaylistMock.mockResolvedValueOnce({ data: { id: 'new-p-1' } });
    addAlbumMock.mockResolvedValueOnce({ data: { addedCount: 2, trackCount: 4 } });

    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const newBtn = screen.getByRole('button', { name: /New playlist…/i });
    fireEvent.click(newBtn);

    const input = screen.getByPlaceholderText('Playlist name');
    fireEvent.change(input, { target: { value: 'My Brand New Playlist' } });

    const createBtn = screen.getByRole('button', { name: /Create & add/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Playlist created — added 2 of 4 songs');
    });
  });

  it('handles create playlist failure correctly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createPlaylistMock.mockRejectedValueOnce(new Error('Create failure'));

    customRender(<AddAlbumToPlaylistSubmenu albumId="album-123" />);

    const newBtn = screen.getByRole('button', { name: /New playlist…/i });
    fireEvent.click(newBtn);

    const input = screen.getByPlaceholderText('Playlist name');
    fireEvent.change(input, { target: { value: 'Failure Playlist' } });

    const createBtn = screen.getByRole('button', { name: /Create & add/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not create playlist');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });
});
