import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumLibraryContextMenu } from './AlbumLibraryContextMenu';
import { AlbumSystemKind } from '@repo/db';

const deleteAlbumMock = vi.fn();
const deleteAlbumIsPending = { current: false };

vi.mock('@/hooks/api/library-albums/useDeleteLibraryAlbum', () => ({
  useDeleteLibraryAlbum: () => ({
    mutateAsync: deleteAlbumMock,
    get isPending() {
      return deleteAlbumIsPending.current;
    },
  }),
}));

const useAlbumLibraryActionsMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAlbumLibraryActions', () => ({
  useAlbumLibraryActions: (args: any) => useAlbumLibraryActionsMock(args),
}));

vi.mock('@/components/playlists/AddAlbumToPlaylistSubmenu', () => ({
  AddAlbumToPlaylistSubmenu: ({ albumId }: { albumId: string }) => (
    <div data-testid="mock-add-to-playlist-submenu">Add to Playlist (Album ID: {albumId})</div>
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params: Record<string, string>;
  }) => (
    <a href={to} data-params={JSON.stringify(params)} data-testid="mock-link">
      {children}
    </a>
  ),
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
        <button
          type="button"
          data-testid="dialog-on-open-true"
          onClick={() => onOpenChange?.(true)}
        >
          OpenTrue
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
  DialogDescription: ({ children }: PropsWithChildren) => (
    <p data-testid="mock-dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: PropsWithChildren) => (
    <div data-testid="mock-dialog-footer">{children}</div>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean | 'indeterminate') => void;
    id?: string;
  }) => (
    <div>
      <input
        type="checkbox"
        id={id}
        data-testid="mock-checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange((e.target as HTMLInputElement).checked)}
      />
      <button
        type="button"
        data-testid="mock-checkbox-indeterminate"
        onClick={() => onCheckedChange('indeterminate')}
      >
        Indeterminate
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenuItem: ({ children, onClick, disabled, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>;
    return (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  },
  ContextMenuSeparator: () => <hr data-testid="menu-separator" />,
}));

describe('AlbumLibraryContextMenu', () => {
  const defaultAlbum = {
    id: 'album-1',
    name: 'Awesome Album',
    systemKind: AlbumSystemKind.none,
  };

  const actionsResult = {
    allInFavorites: false,
    favoritesMembershipPending: false,
    noLibraryTracks: false,
    favoritesActionDisabled: false,
    toggleAlbumFavorites: vi.fn(),
    shareAlbum: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    deleteAlbumIsPending.current = false;
    deleteAlbumMock.mockReset();
    useAlbumLibraryActionsMock.mockReturnValue(actionsResult);
  });

  it('renders menu items correctly', () => {
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);

    expect(screen.getByText('Add to favorites')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByTestId('mock-add-to-playlist-submenu')).toBeInTheDocument();
  });

  it('toggles favorites when favorites button is clicked', () => {
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);
    const favoritesBtn = screen.getByText('Add to favorites');
    fireEvent.click(favoritesBtn);
    expect(actionsResult.toggleAlbumFavorites).toHaveBeenCalled();
  });

  it('triggers shareAlbum when Share is clicked', () => {
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);
    const shareBtn = screen.getByText('Share');
    fireEvent.click(shareBtn);
    expect(actionsResult.shareAlbum).toHaveBeenCalled();
  });

  it('hides Edit link when systemKind is not none', () => {
    customRender(
      <AlbumLibraryContextMenu
        album={{ ...defaultAlbum, systemKind: AlbumSystemKind.unknown_bucket }}
      />,
    );
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('opens delete dialog, handles keep tracks checkbox, and confirms delete successfully', async () => {
    deleteAlbumMock.mockResolvedValue(undefined);
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    // Verify dialog is open
    expect(screen.getByTestId('mock-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();

    // Toggle keep tracks checkbox
    const checkbox = screen.getByTestId('mock-checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Verify keeps tracks alert is rendered
    expect(screen.getByText(/Tracks will be unlinked from this album/)).toBeInTheDocument();

    // Trigger delete action
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete Album' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteAlbumMock).toHaveBeenCalledWith({ id: 'album-1', keepTracks: true });
      expect(toast.success).toHaveBeenCalledWith('Album deleted successfully');
      expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();
    });
  });

  it('handles delete failure and rolls back keeps tracks state', async () => {
    deleteAlbumMock.mockRejectedValue(new Error('Delete failed'));
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete Album' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteAlbumMock).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Failed to delete album');
    });
  });

  it('shows favorites pending / description state depending on hook flags', () => {
    useAlbumLibraryActionsMock.mockReturnValue({
      ...actionsResult,
      favoritesMembershipPending: true,
      allInFavorites: false,
    });

    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);
    const favoritesBtn = screen.getByText('Add to favorites');
    expect(favoritesBtn.closest('button') ?? favoritesBtn).toHaveAttribute(
      'title',
      'Checking favorites…',
    );
  });

  it('handles dialog closing via Cancel button or onOpenChange and resets keep tracks checkbox', () => {
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('mock-dialog')).toBeInTheDocument();

    // Toggle checkbox to true
    const checkbox = screen.getByTestId('mock-checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Close via onOpenChange (close-dialog-btn)
    const closeBtn = screen.getByTestId('close-dialog-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();

    // Reopen and verify it was reset to unchecked
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('mock-dialog')).toBeInTheDocument();
    const checkboxReopened = screen.getByTestId('mock-checkbox');
    expect(checkboxReopened).not.toBeChecked();

    // Close via cancel button
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();
  });

  it('invokes onOpenChange(true) without clearing keep-tracks when dialog stays open', () => {
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);
    fireEvent.click(screen.getByText('Delete'));
    const checkbox = screen.getByTestId('mock-checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByTestId('dialog-on-open-true'));

    expect(checkbox).toBeChecked();
    expect(screen.getByTestId('mock-dialog')).toBeInTheDocument();
  });

  it('sets keep tracks unchecked when Radix passes indeterminate to onCheckedChange', () => {
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);
    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByTestId('mock-checkbox'));
    expect(screen.getByTestId('mock-checkbox')).toBeChecked();

    fireEvent.click(screen.getByTestId('mock-checkbox-indeterminate'));
    expect(screen.getByTestId('mock-checkbox')).not.toBeChecked();
  });

  it('sets title attribute to warning when noLibraryTracks is true', () => {
    useAlbumLibraryActionsMock.mockReturnValue({
      ...actionsResult,
      noLibraryTracks: true,
      allInFavorites: false,
    });

    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);
    const favoritesBtn = screen.getByRole('button', { name: /Add to favorites/i });
    expect(favoritesBtn).toHaveAttribute('title', 'Add songs to this album in your library first');
  });

  it('renders "Remove from favorites" and sets title attribute appropriately when allInFavorites is true', () => {
    useAlbumLibraryActionsMock.mockReturnValue({
      ...actionsResult,
      allInFavorites: true,
    });

    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);
    const favoritesBtn = screen.getByRole('button', { name: /Remove from favorites/i });
    expect(favoritesBtn).toBeInTheDocument();
    expect(favoritesBtn).toHaveAttribute('title', 'Remove from favorites');
  });

  it('renders "Deleting..." on delete button and disables buttons when isDeleting is true', () => {
    deleteAlbumIsPending.current = true;
    customRender(<AlbumLibraryContextMenu album={defaultAlbum} />);

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Deleting...' });

    expect(confirmDeleteBtn).toBeInTheDocument();
    expect(cancelBtn).toBeDisabled();
    expect(confirmDeleteBtn).toBeDisabled();
  });
});
