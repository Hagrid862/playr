import {
  UpdateLibraryTrackRequest,
  UpdateLibraryTrackRequestSchema,
  ZodTrack,
} from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { useNavigate } from '@tanstack/react-router';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { EditTrackForm } from './EditTrackForm';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: vi.fn(() => vi.fn()),
}));

const mockTrack: ZodTrack = {
  id: 'track-123',
  title: 'Existing Song',
  trackNumber: 1,
  diskNumber: 1,
  duration: 180,
  explicit: false,
  lyrics: null,
  listenedCount: 0,
  albumId: 'album-123',
  visibility: 'private',
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
      deletedAt: null,
      isCommunity: false,
      avatar: null,
      genres: [],
      verified: false,
      visibility: 'public',
      bannerId: null,
      avatarId: null,
    },
  ],
};

describe('EditTrackForm', () => {
  const onSubmit = vi.fn();
  const albumId = 'album-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders correctly with initial values', () => {
      customRender(
        <EditTrackForm track={mockTrack} albumId={albumId} isLoading={false} onSubmit={onSubmit} />,
      );

      expect(screen.getByLabelText(/track title/i)).toHaveValue('Existing Song');
      expect(screen.getByLabelText(/track no/i)).toHaveValue(1);
      expect(screen.getByLabelText(/disk no/i)).toHaveValue(1);
      expect(screen.getByLabelText(/explicit content/i)).not.toBeChecked();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('disables submit button when loading', () => {
      customRender(
        <EditTrackForm track={mockTrack} albumId={albumId} isLoading={true} onSubmit={onSubmit} />,
      );
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });

    it('handles track without artists safely', () => {
      const trackWithoutArtists = { ...mockTrack, artists: undefined };
      customRender(
        <EditTrackForm
          track={trackWithoutArtists}
          albumId={albumId}
          isLoading={false}
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByLabelText(/track title/i)).toHaveValue('Existing Song');
    });
  });

  describe('submission', () => {
    it('submits form with updated data', async () => {
      const user = userEvent.setup();
      const navigate = vi.fn();
      vi.mocked(useNavigate).mockReturnValue(navigate);

      customRender(
        <EditTrackForm track={mockTrack} albumId={albumId} isLoading={false} onSubmit={onSubmit} />,
      );

      await user.clear(screen.getByLabelText(/track title/i));
      await user.type(screen.getByLabelText(/track title/i), 'Updated Song');

      await user.clear(screen.getByLabelText(/disk no/i));
      await user.type(screen.getByLabelText(/disk no/i), '2');

      await user.clear(screen.getByLabelText(/track no/i));
      await user.type(screen.getByLabelText(/track no/i), '5');

      await user.click(screen.getByLabelText(/explicit content/i));

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          title: 'Updated Song',
          trackNumber: 5,
          diskNumber: 2,
          explicit: true,
          artistIds: ['artist-123'],
        });
        expect(navigate).toHaveBeenCalledWith({
          to: '/app/library/albums/$id',
          params: { id: albumId },
        });
      });
    });

    it('handles submission error gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Submission failed');
      onSubmit.mockRejectedValue(error);

      customRender(
        <EditTrackForm track={mockTrack} albumId={albumId} isLoading={false} onSubmit={onSubmit} />,
      );

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Submission failed:', error);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup();
      customRender(
        <EditTrackForm track={mockTrack} albumId={albumId} isLoading={false} onSubmit={onSubmit} />,
      );

      const titleInput = screen.getByLabelText(/track title/i);
      await user.clear(titleInput);
      await user.tab();

      expect(await screen.findByText(/track title cannot be empty/i)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('displays server errors when provided', () => {
      const serverErrors = {
        title: 'Title already exists',
      };

      customRender(
        <EditTrackForm
          track={mockTrack}
          albumId={albumId}
          isLoading={false}
          onSubmit={onSubmit}
          serverErrors={serverErrors}
        />,
      );

      expect(screen.getByText(/title already exists/i)).toBeInTheDocument();
    });

    it('handles root validation errors', async () => {
      const user = userEvent.setup();

      const safeParseSpy = vi.spyOn(UpdateLibraryTrackRequestSchema, 'safeParse');
      const error = new ZodError([
        {
          path: [],
          message: 'Root error occurred',
          code: 'custom',
        },
      ]) as ZodError<UpdateLibraryTrackRequest>;
      safeParseSpy.mockReturnValueOnce({ success: false, error });

      customRender(
        <EditTrackForm track={mockTrack} albumId={albumId} isLoading={false} onSubmit={onSubmit} />,
      );

      const titleInput = screen.getByLabelText(/track title/i);
      await user.click(titleInput);
      await user.tab();

      expect(await screen.findByText(/root error occurred/i)).toBeInTheDocument();
      safeParseSpy.mockRestore();
    });

    it('handles multiple validation errors for the same field', async () => {
      const user = userEvent.setup();

      const safeParseSpy = vi.spyOn(UpdateLibraryTrackRequestSchema, 'safeParse');
      const error = new ZodError([
        { path: ['title'], message: 'First error', code: 'custom' },
        { path: ['title'], message: 'Second error', code: 'custom' },
      ]) as ZodError<UpdateLibraryTrackRequest>;
      safeParseSpy.mockReturnValueOnce({ success: false, error });

      customRender(
        <EditTrackForm track={mockTrack} albumId={albumId} isLoading={false} onSubmit={onSubmit} />,
      );

      const titleInput = screen.getByLabelText(/track title/i);
      await user.click(titleInput);
      await user.tab();

      expect(await screen.findByText(/first error/i)).toBeInTheDocument();
      safeParseSpy.mockRestore();
    });

    it('handles undefined/nullish values in track prop', () => {
      const partialTrack = {
        ...mockTrack,
        title: undefined,
        trackNumber: undefined,
        diskNumber: undefined,
      };

      customRender(
        <EditTrackForm
          // @ts-expect-error Testing runtime behavior with partial data
          track={partialTrack}
          albumId={albumId}
          isLoading={false}
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByLabelText(/track title/i)).toHaveValue('');
      expect(screen.getByLabelText(/track no/i)).toHaveValue(null);
      expect(screen.getByLabelText(/disk no/i)).toHaveValue(null);
    });
  });
});
