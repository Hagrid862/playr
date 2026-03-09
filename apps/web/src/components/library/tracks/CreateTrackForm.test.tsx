import {
  CreateLibraryTrackRequest,
  CreateLibraryTrackRequestSchema,
  ZodAlbumInfer,
} from '@repo/contracts';
import { useNavigate } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { CreateTrackForm } from './CreateTrackForm';

// Mocking link because it needs router context
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: vi.fn(() => vi.fn()),
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
      avatarId: 'id-234',
    },
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

    const file = new File(['(⌐□_□)'], 'audio.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/audio file/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          title: 'New Song',
          trackNumber: 2,
          diskNumber: 1,
          explicit: true,
          albumId: 'album-123',
          artistIds: ['artist-123'],
        },
        expect.any(File),
      );
    });
  });

  it('disables submit button when loading', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={true} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
  });

  it('navigates away when "Add another track" is not checked', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/track title/i), 'New Song');

    const file = new File(['(⌐□_□)'], 'audio.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/audio file/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith({ to: '..' });
    });
  });

  it('resets form and increments track number when "Add another track" is checked', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    // Initial state
    expect(screen.getByLabelText(/track no/i)).toHaveValue(1);

    await user.type(screen.getByLabelText(/track title/i), 'Song 1');
    await user.click(screen.getByLabelText(/add another track/i));

    const file = new File(['(⌐□_□)'], 'audio.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/audio file/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    // Check if form is reset and incremented
    expect(screen.getByLabelText(/track title/i)).toHaveValue('');
    expect(screen.getByLabelText(/track no/i)).toHaveValue(2);
  });

  it('updates disk number correctly', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const diskInput = screen.getByLabelText(/disk no/i);
    await user.clear(diskInput);
    await user.type(diskInput, '2');

    expect(diskInput).toHaveValue(2);
  });

  it('displays server errors when provided', () => {
    const serverErrors = {
      title: 'Title already exists',
      trackNumber: 'Invalid track number',
    };

    render(
      <CreateTrackForm
        album={mockAlbum}
        isLoading={false}
        onSubmit={onSubmit}
        serverErrors={serverErrors}
      />,
    );

    expect(screen.getByText(/title already exists/i)).toBeInTheDocument();
    expect(screen.getByText(/invalid track number/i)).toBeInTheDocument();
  });

  it('handles submission error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Submission failed');
    onSubmit.mockRejectedValue(error);

    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/track title/i), 'New Song');

    const file = new File(['(⌐□_□)'], 'audio.mp3', { type: 'audio/mpeg' });
    const fileInput = screen.getByLabelText(/audio file/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Submission failed:', error);
    });

    consoleSpy.mockRestore();
  });

  it('handles album without artists gracefully', () => {
    const albumWithoutArtists: ZodAlbumInfer = { ...mockAlbum, artists: undefined };
    render(<CreateTrackForm album={albumWithoutArtists} isLoading={false} onSubmit={onSubmit} />);

    expect(screen.getByRole('button', { name: /add track/i })).toBeInTheDocument();
  });

  it('handles validation errors correctly and hits branch logic', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const titleInput = screen.getByLabelText(/track title/i);
    // Triggering multiple issues on the same field might hit !errors[path]
    // The current schema has min and max.
    // Entering a long string will hit max.
    await user.type(titleInput, 'a'.repeat(300));
    await user.tab();

    expect(
      await screen.findByText(/track title must be 255 characters or less/i),
    ).toBeInTheDocument();
  });

  it('handles root validation errors', async () => {
    const user = userEvent.setup();

    // Mock safeParse to return a root error
    const safeParseSpy = vi.spyOn(CreateLibraryTrackRequestSchema, 'safeParse');
    const error = new ZodError([
      {
        path: [],
        message: 'Root error occurred',
        code: 'custom',
      },
    ]) as ZodError<CreateLibraryTrackRequest>;
    safeParseSpy.mockReturnValueOnce({ success: false, error });

    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    // Trigger validation
    const titleInput = screen.getByLabelText(/track title/i);
    await user.click(titleInput);
    await user.tab();

    expect(await screen.findByText(/root error occurred/i)).toBeInTheDocument();
    safeParseSpy.mockRestore();
  });

  it('handles multiple validation errors for the same field', async () => {
    const user = userEvent.setup();

    // Mock safeParse to return multiple errors for the same field
    const safeParseSpy = vi.spyOn(CreateLibraryTrackRequestSchema, 'safeParse');
    const error = new ZodError([
      {
        path: ['title'],
        message: 'First error',
        code: 'custom',
      },
      {
        path: ['title'],
        message: 'Second error',
        code: 'custom',
      },
    ]) as ZodError<CreateLibraryTrackRequest>;
    safeParseSpy.mockReturnValueOnce({ success: false, error });

    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    // Trigger validation
    const titleInput = screen.getByLabelText(/track title/i);
    await user.click(titleInput);
    await user.tab();

    // This covers: if (!errors[path])
    expect(await screen.findByText('First error')).toBeInTheDocument();

    safeParseSpy.mockRestore();
  });
});
