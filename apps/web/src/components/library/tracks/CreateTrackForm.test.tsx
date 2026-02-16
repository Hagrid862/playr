import { ZodAlbumInfer } from '@repo/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTrackForm } from './CreateTrackForm';

// Mocking link because it needs router context
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockAlbum: ZodAlbumInfer = {
  id: 'album-123',
  name: 'Test Album',
  description: 'A test album',
  type: 'album',
  visibility: 'private',
  totalTracks: 10,
  totalDuration: 300,
  releaseDate: new Date(),
  coverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  artists: [
    {
      id: 'artist-123',
      name: 'Test Artist',
      description: 'Test Description',
      createdAt: new Date(),
      updatedAt: new Date(),
      isCommunity: false,
      avatar: null,
      genres: [],
      verified: false,
      visibility: 'public',
      deletedAt: new Date(),
      bannerId: 'id-123',
      avatarId: 'id-234'
    }
  ],
  tracks: [],
  genres: [],
  cover: null,
};

describe('CreateTrackForm', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    onSubmit.mockClear();
  });

  it('renders correctly with default values', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/track title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/track no/i)).toHaveValue(1);
    expect(screen.getByLabelText(/disk no/i)).toHaveValue(1);
    expect(screen.getByLabelText(/explicit content/i)).not.toBeChecked();
    expect(screen.getByRole('button', { name: /add track/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    // Title is required. Trigger validation via tab (blur)
    const titleInput = screen.getByLabelText(/track title/i);
    await user.click(titleInput);
    await user.tab();
    
    expect(await screen.findByText(/track title is required/i)).toBeInTheDocument();
    
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/track title/i), 'New Song');
    await user.clear(screen.getByLabelText(/track no/i));
    await user.type(screen.getByLabelText(/track no/i), '2');
    await user.click(screen.getByLabelText(/explicit content/i));

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'New Song',
        trackNumber: 2,
        diskNumber: 1,
        explicit: true,
        albumId: 'album-123',
        artistIds: ['artist-123'],
      });
    });
  });

  it('disables submit button when loading', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={true} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
  });
});
