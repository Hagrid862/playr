import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddToPlaylistSubmenu } from './AddToPlaylistSubmenu';
import { PlaylistSystemRole } from '@repo/db';

const addTrackMock = vi.fn();
const createPlaylistMock = vi.fn();

const mockPlaylists = {
  current: {
    data: {
      items: [
        {
          id: 'playlist-favorites',
          name: 'My Favorites',
          systemRole: PlaylistSystemRole.favorites,
          cover: null,
        },
        {
          id: 'playlist-custom-cover',
          name: 'Chill Mix',
          systemRole: null,
          cover: { url: 'https://example.com/chill.jpg' },
        },
        {
          id: 'playlist-no-cover',
          name: 'Rock Vibes',
          systemRole: null,
          cover: null,
        },
      ],
    },
  } as any,
};

vi.mock('@/hooks/api/library-playlists', () => ({
  useLibraryPlaylists: () => ({ data: mockPlaylists.current }),
  useAddPlaylistTrack: () => ({ mutateAsync: addTrackMock, isPending: false }),
  useCreateLibraryPlaylist: () => ({ mutateAsync: createPlaylistMock, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) =>
    open ? (
      <div data-testid="mock-dialog">
        <button type="button" data-testid="close-dialog-btn" onClick={() => onOpenChange(false)}>
          Close
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: any) => <div data-testid="mock-dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="mock-dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="mock-dialog-title">{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="mock-dialog-footer">{children}</div>,
}));

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenuItem: ({ children, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ContextMenuPortal: ({ children }: any) => <>{children}</>,
  ContextMenuSeparator: () => <hr data-testid="menu-separator" />,
  ContextMenuSub: ({ children }: any) => <div data-testid="mock-context-sub">{children}</div>,
  ContextMenuSubContent: ({ children }: any) => (
    <div data-testid="mock-context-sub-content">{children}</div>
  ),
  ContextMenuSubTrigger: ({ children }: any) => (
    <div data-testid="mock-context-sub-trigger">{children}</div>
  ),
}));

vi.mock('@/components/playlists/FavoritesPlaylistCover', () => ({
  FavoritesPlaylistCover: () => <div data-testid="favorites-cover" />,
}));

import { toast } from 'sonner';

describe('AddToPlaylistSubmenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlaylists.current = {
      data: {
        items: [
          {
            id: 'playlist-favorites',
            name: 'My Favorites',
            systemRole: PlaylistSystemRole.favorites,
            cover: null,
          },
          {
            id: 'playlist-custom-cover',
            name: 'Chill Mix',
            systemRole: null,
            cover: { url: 'https://example.com/chill.jpg' },
          },
          {
            id: 'playlist-no-cover',
            name: 'Rock Vibes',
            systemRole: null,
            cover: null,
          },
        ],
      },
    };
  });

  it('renders context menu items properly with system roles and custom covers', () => {
    const { container } = customRender(<AddToPlaylistSubmenu trackId="track-123" />);

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
    customRender(<AddToPlaylistSubmenu trackId="track-123" />);
    expect(screen.queryByText('My Favorites')).not.toBeInTheDocument();
  });

  it('adds track to playlist successfully', async () => {
    addTrackMock.mockResolvedValueOnce({});

    customRender(<AddToPlaylistSubmenu trackId="track-123" />);

    const itemBtn = screen.getByRole('button', { name: /Chill Mix/i });
    fireEvent.click(itemBtn);

    await waitFor(() => {
      expect(addTrackMock).toHaveBeenCalledWith({
        playlistId: 'playlist-custom-cover',
        body: { trackId: 'track-123' },
      });
      expect(toast.success).toHaveBeenCalledWith('Added to playlist');
    });
  });

  it('handles track addition failure correctly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    addTrackMock.mockRejectedValueOnce(new Error('Add failure'));

    customRender(<AddToPlaylistSubmenu trackId="track-123" />);

    const itemBtn = screen.getByRole('button', { name: /Chill Mix/i });
    fireEvent.click(itemBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not add to playlist');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });

  it('opens dialog, validates empty name, and closes it', async () => {
    customRender(<AddToPlaylistSubmenu trackId="track-123" />);

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

  it('creates playlist and adds track successfully', async () => {
    createPlaylistMock.mockResolvedValueOnce({ data: { id: 'new-p-1' } });
    addTrackMock.mockResolvedValueOnce({});

    customRender(<AddToPlaylistSubmenu trackId="track-123" />);

    const newBtn = screen.getByRole('button', { name: /New playlist…/i });
    fireEvent.click(newBtn);

    const input = screen.getByPlaceholderText('Playlist name');
    fireEvent.change(input, { target: { value: 'My Brand New Playlist' } });

    const createBtn = screen.getByRole('button', { name: /Create & add/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(createPlaylistMock).toHaveBeenCalledWith({ name: 'My Brand New Playlist' });
      expect(addTrackMock).toHaveBeenCalledWith({
        playlistId: 'new-p-1',
        body: { trackId: 'track-123' },
      });
      expect(toast.success).toHaveBeenCalledWith('Playlist created and track added');
      expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();
    });
  });

  it('handles create playlist failure correctly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createPlaylistMock.mockRejectedValueOnce(new Error('Create failure'));

    customRender(<AddToPlaylistSubmenu trackId="track-123" />);

    const newBtn = screen.getByRole('button', { name: /New playlist…/i });
    vi.spyOn(console, 'error').mockImplementation(() => {});
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
