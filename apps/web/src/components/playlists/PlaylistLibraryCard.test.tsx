import { imageBuilder } from '@repo/testing';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import type { MouseEventHandler, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistLibraryCard } from './PlaylistLibraryCard';
import { PlaylistSystemRole } from '@repo/db';
import type { LibraryPlaylistListItem } from '@repo/contracts';

const pinPlaylistMock = vi.fn();
const pinPlaylistIsPending = { current: false };
const unpinPlaylistMock = vi.fn();
const unpinPlaylistIsPending = { current: false };
const deletePlaylistMock = vi.fn();
const deletePlaylistIsPending = { current: false };

vi.mock('@/hooks/api/library-playlists/useLibraryPlaylistMutations', () => ({
  usePinPlaylist: () => ({
    mutateAsync: pinPlaylistMock,
    get isPending() {
      return pinPlaylistIsPending.current;
    },
  }),
  useUnpinPlaylist: () => ({
    mutateAsync: unpinPlaylistMock,
    get isPending() {
      return unpinPlaylistIsPending.current;
    },
  }),
  useDeleteLibraryPlaylist: () => ({
    mutateAsync: deletePlaylistMock,
    get isPending() {
      return deletePlaylistIsPending.current;
    },
  }),
}));

const navigateMock = vi.fn();

type MockLinkProps = PropsWithChildren<{
  to: string;
  params?: Record<string, string>;
}>;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: MockLinkProps) => (
    <a href={to} data-params={JSON.stringify(params)} data-testid="mock-link">
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
    onOpenChange,
  }: PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) =>
    open ? (
      <div data-testid="mock-alert-dialog">
        <button
          type="button"
          data-testid="close-alert-dialog-btn"
          onClick={() => onOpenChange?.(false)}
        >
          Close
        </button>
        {children}
      </div>
    ) : null,
  AlertDialogContent: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: PropsWithChildren) => (
    <h2 data-testid="mock-alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: PropsWithChildren) => (
    <p data-testid="mock-alert-dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-alert-dialog-footer">{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    onClick,
    disabled,
  }: PropsWithChildren<{ onClick?: MouseEventHandler<HTMLButtonElement>; disabled?: boolean }>) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
  }: PropsWithChildren<{ onClick?: MouseEventHandler<HTMLButtonElement>; disabled?: boolean }>) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-context-menu">{children}</div>
  ),
  ContextMenuTrigger: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-context-menu-trigger">{children}</div>
  ),
  ContextMenuContent: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-context-menu-content">{children}</div>
  ),
  ContextMenuItem: ({ children, onSelect }: PropsWithChildren<{ onSelect?: () => void }>) => {
    return (
      <button type="button" onClick={onSelect}>
        {children}
      </button>
    );
  },
  ContextMenuSeparator: () => <hr data-testid="menu-separator" />,
}));

describe('PlaylistLibraryCard', () => {
  const defaultPlaylist = (): LibraryPlaylistListItem => ({
    id: 'playlist-1',
    name: 'Chill Vibes',
    systemRole: null,
    pinned: false,
    pinOrder: null,
    pinId: null,
    cover: null,
    trackCount: 5,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    pinPlaylistIsPending.current = false;
    unpinPlaylistIsPending.current = false;
    deletePlaylistIsPending.current = false;
  });

  it('renders general layout with playlist details and icon cover when cover is missing', () => {
    const playlist = defaultPlaylist();
    playlist.trackCount = 1; // Singular test
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    expect(screen.getByText('Chill Vibes')).toBeInTheDocument();
    expect(screen.getByText('1 song')).toBeInTheDocument();
    expect(screen.getByTestId('mock-link')).toHaveAttribute('href', '/app/playlists/$playlistId');
  });

  it('renders custom image cover when cover URL is available', () => {
    const playlist = defaultPlaylist();
    playlist.cover = imageBuilder({
      url: 'https://example.com/chill.jpg',
      key: 'key',
    });
    const { container } = customRender(<PlaylistLibraryCard playlist={playlist} />);

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/chill.jpg');
    expect(screen.getByText('5 songs')).toBeInTheDocument();
  });

  it('renders Favorites cover when playlist has favorites systemRole', () => {
    const playlist = defaultPlaylist();
    playlist.systemRole = PlaylistSystemRole.favorites;
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    // FavoritesPlaylistCover checks
    expect(screen.getByText('Chill Vibes')).toBeInTheDocument();
  });

  it('handles Pin to sidebar mutation correctly', async () => {
    pinPlaylistMock.mockResolvedValueOnce(undefined);
    const playlist = defaultPlaylist();
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const pinBtn = screen.getByRole('button', { name: /Pin to sidebar/i });
    fireEvent.click(pinBtn);

    await waitFor(() => {
      expect(pinPlaylistMock).toHaveBeenCalledWith({ playlistId: 'playlist-1' });
      expect(toast.success).toHaveBeenCalledWith('Pinned to sidebar');
    });
  });

  it('handles Pin to sidebar mutation failure correctly', async () => {
    pinPlaylistMock.mockRejectedValueOnce(new Error('Mutation error'));
    const playlist = defaultPlaylist();
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const pinBtn = screen.getByRole('button', { name: /Pin to sidebar/i });
    fireEvent.click(pinBtn);

    await waitFor(() => {
      expect(pinPlaylistMock).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Could not pin playlist');
    });
  });

  it('handles Unpin from sidebar mutation correctly', async () => {
    unpinPlaylistMock.mockResolvedValueOnce(undefined);
    const playlist = defaultPlaylist();
    playlist.pinned = true;
    playlist.pinId = 'pin-abc';
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const unpinBtn = screen.getByRole('button', { name: /Unpin from sidebar/i });
    fireEvent.click(unpinBtn);

    await waitFor(() => {
      expect(unpinPlaylistMock).toHaveBeenCalledWith('pin-abc');
      expect(toast.success).toHaveBeenCalledWith('Unpinned from sidebar');
    });
  });

  it('does not unpin if pinId is missing', async () => {
    const playlist = defaultPlaylist();
    playlist.pinned = true;
    playlist.pinId = null; // Unpinnable
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const unpinBtn = screen.getByRole('button', { name: /Unpin from sidebar/i });
    fireEvent.click(unpinBtn);

    expect(unpinPlaylistMock).not.toHaveBeenCalled();
  });

  it('handles Unpin from sidebar mutation failure correctly', async () => {
    unpinPlaylistMock.mockRejectedValueOnce(new Error('Mutation error'));
    const playlist = defaultPlaylist();
    playlist.pinned = true;
    playlist.pinId = 'pin-abc';
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const unpinBtn = screen.getByRole('button', { name: /Unpin from sidebar/i });
    fireEvent.click(unpinBtn);

    await waitFor(() => {
      expect(unpinPlaylistMock).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Could not unpin playlist');
    });
  });

  it('navigates to edit screen when Edit is clicked', () => {
    const playlist = defaultPlaylist();
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const editBtn = screen.getByRole('button', { name: /Edit playlist/i });
    fireEvent.click(editBtn);

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/app/playlists/$playlistId/edit',
      params: { playlistId: 'playlist-1' },
    });
  });

  it('opens and cancels the delete dialog', async () => {
    const playlist = defaultPlaylist();
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const deleteBtn = screen.getByRole('button', { name: /Delete playlist/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('mock-alert-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete playlist?')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('close-alert-dialog-btn');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('mock-alert-dialog')).not.toBeInTheDocument();
    });
  });

  it('confirms delete successfully', async () => {
    deletePlaylistMock.mockResolvedValueOnce(undefined);
    const playlist = defaultPlaylist();
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const deleteBtn = screen.getByRole('button', { name: /Delete playlist/i });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /^Delete$/ });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deletePlaylistMock).toHaveBeenCalledWith('playlist-1');
      expect(toast.success).toHaveBeenCalledWith('Playlist deleted');
      expect(screen.queryByTestId('mock-alert-dialog')).not.toBeInTheDocument();
    });
  });

  it('handles delete failure correctly', async () => {
    deletePlaylistMock.mockRejectedValueOnce(new Error('Delete failed'));
    const playlist = defaultPlaylist();
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const deleteBtn = screen.getByRole('button', { name: /Delete playlist/i });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /^Delete$/ });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deletePlaylistMock).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Could not delete playlist');
    });
  });

  it('shows Deleting... state when deleting is pending', () => {
    const playlist = defaultPlaylist();
    deletePlaylistIsPending.current = true;
    customRender(<PlaylistLibraryCard playlist={playlist} />);

    const deleteBtn = screen.getByRole('button', { name: /Delete playlist/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('button', { name: /Deleting…/i })).toBeInTheDocument();
  });
});
