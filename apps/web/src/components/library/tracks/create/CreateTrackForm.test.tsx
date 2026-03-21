import { useGlobalDragStore } from '@/hooks/use-global-drag';
import {
  CreateLibraryTrackRequest,
  CreateLibraryTrackRequestSchema,
  ZodAlbumInfer,
} from '@repo/contracts';
import { albumBuilder, artistBuilder } from '@repo/testing';
import { useNavigate } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { CreateTrackForm } from './CreateTrackForm';

vi.mock('@/lib/audio-metadata', () => ({
  extractMetadataFromAudioFile: vi.fn().mockResolvedValue(null),
  extractCoverFromAudioFile: vi.fn().mockResolvedValue(null),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: vi.fn(() => vi.fn()),
}));

export const mockState = {
  suppressRef: false,
};

vi.mock('@/components/form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/form')>();
  return {
    ...actual,
    FileField: ({
      label,
      value,
      onChange,
      onBlur,
      error,
      inputRef,
    }: {
      label: string;
      value: File | null;
      onChange: (file: File | null) => void;
      onBlur: () => void;
      error?: string;
      inputRef: React.RefObject<HTMLInputElement | null>;
      [key: string]: unknown;
    }) => (
      <div>
        <label htmlFor="audio-file-mock">{label}</label>
        <input
          id="audio-file-mock"
          type="file"
          accept="audio/*"
          data-testid="audio-file-input"
          data-has-file={String(!!value)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(file ?? null);
          }}
          onBlur={onBlur}
          ref={(el) => {
            if (inputRef && 'current' in inputRef) {
              if (mockState.suppressRef) {
                (inputRef as unknown as { current: HTMLInputElement | null }).current = null;
              } else {
                (inputRef as unknown as { current: HTMLInputElement | null }).current =
                  el as HTMLInputElement;
              }
            }
          }}
        />
        {error && <span role="alert">{error}</span>}
      </div>
    ),
  };
});

async function uploadFileToInput(
  fileInput: HTMLElement,
  file: File,
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.upload(fileInput as HTMLInputElement, file);
}

const mockAlbum = { ...albumBuilder(), artists: [artistBuilder()] };

describe('CreateTrackForm', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    onSubmit.mockClear();
    useGlobalDragStore.getState().reset();
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

    const titleInput = screen.getByLabelText(/track title/i);
    await user.click(titleInput);
    await user.tab();

    expect(await screen.findByText(/track title is required/i)).toBeInTheDocument();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const file = new File(['(⌐□_□)'], 'audio.mp3', { type: 'audio/mpeg' });
    const fileList = Object.assign([file], { length: 1, item: () => file }) as FileList;
    fireEvent.drop(window, { dataTransfer: { files: fileList } });

    await waitFor(() => {
      expect(screen.getByLabelText(/track title/i)).toHaveValue('Audio');
    });

    await user.clear(screen.getByLabelText(/track no/i));
    await user.type(screen.getByLabelText(/track no/i), '2');
    await user.click(screen.getByLabelText(/explicit content/i));

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Audio',
          trackNumber: 2,
          diskNumber: 1,
          explicit: true,
          albumId: mockAlbum.id,
          artistIds: [mockAlbum.artists[0].id],
        }),
        expect.any(File),
        null,
      );
    });
  });

  it('shows error when audio file is missing on submit', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/track title/i), 'New Song');
    await user.click(screen.getByRole('button', { name: /add track/i }));

    expect(await screen.findByText(/audio file is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
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
    await uploadFileToInput(screen.getByTestId('audio-file-input'), file, user);

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

    expect(screen.getByLabelText(/track no/i)).toHaveValue(1);

    await user.type(screen.getByLabelText(/track title/i), 'Song 1');
    await user.click(screen.getByLabelText(/add another track/i));

    const file = new File(['(⌐□_□)'], 'audio.mp3', { type: 'audio/mpeg' });
    await uploadFileToInput(screen.getByTestId('audio-file-input'), file, user);

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

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
    onSubmit.mockRejectedValue(new Error('Submission failed'));

    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/track title/i), 'New Song');

    const file = new File(['(⌐□_□)'], 'audio.mp3', { type: 'audio/mpeg' });
    await uploadFileToInput(screen.getByTestId('audio-file-input'), file, user);

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    expect(screen.getByText('Submission failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add track/i })).toBeInTheDocument();
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
    await user.type(titleInput, 'a'.repeat(300));
    await user.tab();

    expect(
      await screen.findByText(/track title must be 255 characters or less/i),
    ).toBeInTheDocument();
  });

  it('handles root validation errors', async () => {
    const user = userEvent.setup();

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

    const titleInput = screen.getByLabelText(/track title/i);
    await user.click(titleInput);
    await user.tab();

    expect(await screen.findByText(/root error occurred/i)).toBeInTheDocument();
    safeParseSpy.mockRestore();
  });

  it('handles multiple validation errors for the same field', async () => {
    const user = userEvent.setup();

    const safeParseSpy = vi.spyOn(CreateLibraryTrackRequestSchema, 'safeParse');
    const error = new ZodError([
      { path: ['title'], message: 'First error', code: 'custom' },
      { path: ['title'], message: 'Second error', code: 'custom' },
    ]) as ZodError<CreateLibraryTrackRequest>;
    safeParseSpy.mockReturnValueOnce({ success: false, error });

    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const titleInput = screen.getByLabelText(/track title/i);
    await user.click(titleInput);
    await user.tab();

    expect(await screen.findByText('First error')).toBeInTheDocument();

    safeParseSpy.mockRestore();
  });

  it('shows drop overlay on dragenter with files', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    fireEvent.dragEnter(window, {
      dataTransfer: { items: [{ type: 'audio/mpeg' }] },
    });

    expect(screen.getByText(/Drop audio files to upload/i)).toBeInTheDocument();
  });

  it('does not show drop overlay on dragenter without items', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const event = new Event('dragenter', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: { items: [] }, configurable: true });
    window.dispatchEvent(event);

    expect(screen.queryByText(/Drop audio files to upload/i)).not.toBeInTheDocument();
  });

  it('hides drop overlay on dragleave when counter reaches zero', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    fireEvent.dragEnter(window, {
      dataTransfer: { items: [{ type: 'audio/mpeg' }] },
    });
    expect(screen.getByText(/Drop audio files to upload/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, {});
    expect(screen.queryByText(/Drop audio files to upload/i)).not.toBeInTheDocument();
  });

  it('prevents default behavior on dragover', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const event = new Event('dragover', { bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('hides drop overlay when dragCounter reaches zero after multiple drag enters', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const dataTransfer = { items: [{ type: 'audio/mpeg' }] };
    fireEvent.dragEnter(window, { dataTransfer });
    fireEvent.dragEnter(window, { dataTransfer });
    expect(screen.getByText(/Drop audio files to upload/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, {});
    expect(screen.getByText(/Drop audio files to upload/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, {});
    expect(screen.queryByText(/Drop audio files to upload/i)).not.toBeInTheDocument();
  });

  it('opens multiple files modal when dropping multiple files', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const file1 = new File(['a'], 'track1.mp3', { type: 'audio/mpeg' });
    const file2 = new File(['b'], 'track2.mp3', { type: 'audio/mpeg' });
    const fileList = Object.assign([file1, file2], {
      length: 2,
      item: (i: number) => [file1, file2][i],
    }) as FileList;

    fireEvent.drop(window, { dataTransfer: { files: fileList } });

    expect(screen.getByText('Too Many Files')).toBeInTheDocument();
    expect(screen.getByText(/You can only upload one audio track at a time/)).toBeInTheDocument();
  });

  it('closes multiple files modal when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const file1 = new File(['a'], 'track1.mp3', { type: 'audio/mpeg' });
    const file2 = new File(['b'], 'track2.mp3', { type: 'audio/mpeg' });
    const fileList = Object.assign([file1, file2], {
      length: 2,
      item: (i: number) => [file1, file2][i],
    }) as FileList;

    fireEvent.drop(window, { dataTransfer: { files: fileList } });
    expect(screen.getByText('Too Many Files')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByText('Too Many Files')).not.toBeInTheDocument();
  });

  it('opens invalid format modal when dropping non-audio file', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const file = new File(['x'], 'document.pdf', { type: 'application/pdf' });
    const fileList = Object.assign([file], { length: 1, item: () => file }) as FileList;

    fireEvent.drop(window, { dataTransfer: { files: fileList } });

    expect(screen.getByText('Invalid File Format')).toBeInTheDocument();
    expect(
      screen.getByText(/The file you dropped is not a supported audio format/),
    ).toBeInTheDocument();
  });

  it('closes invalid format modal when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const file = new File(['x'], 'document.pdf', { type: 'application/pdf' });
    const fileList = Object.assign([file], { length: 1, item: () => file }) as FileList;

    fireEvent.drop(window, { dataTransfer: { files: fileList } });
    expect(screen.getByText('Invalid File Format')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByText('Invalid File Format')).not.toBeInTheDocument();
  });

  it('sets audio file when dropping valid audio file', async () => {
    const user = userEvent.setup();
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
    const fileList = Object.assign([file], { length: 1, item: () => file }) as FileList;

    fireEvent.drop(window, { dataTransfer: { files: fileList } });

    await waitFor(() => {
      expect(screen.getByLabelText(/track title/i)).toHaveValue('Track');
    });

    await user.clear(screen.getByLabelText(/track title/i));
    await user.type(screen.getByLabelText(/track title/i), 'Dropped Track');
    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Dropped Track' }),
        expect.any(File),
        null,
      );
    });
  });

  it('handles non-Error submission rejection gracefully', async () => {
    const user = userEvent.setup();
    onSubmit.mockRejectedValue('String reject');

    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/track title/i), 'New Song');

    const file = new File(['(⌐□_□)'], 'audio.mp3', { type: 'audio/mpeg' });
    await uploadFileToInput(screen.getByTestId('audio-file-input'), file, user);

    await user.click(screen.getByRole('button', { name: /add track/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    expect(screen.getByText('Submission failed. Please try again.')).toBeInTheDocument();
  });

  it('does nothing on drop if no files are present', () => {
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const event = new Event('drop', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [] }, configurable: true });
    window.dispatchEvent(event);

    expect(screen.queryByText('Too Many Files')).not.toBeInTheDocument();
    expect(screen.queryByText('Invalid File Format')).not.toBeInTheDocument();
  });

  it('handles drop when fileInputRef current is null', async () => {
    mockState.suppressRef = true;
    render(<CreateTrackForm album={mockAlbum} isLoading={false} onSubmit={onSubmit} />);

    const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
    const fileList = Object.assign([file], { length: 1, item: () => file }) as FileList;

    fireEvent.drop(window, { dataTransfer: { files: fileList } });

    const titleInput = screen.getByLabelText(/track title/i);
    fireEvent.blur(titleInput);
    expect(await screen.findByText(/track title is required/i)).toBeInTheDocument();

    mockState.suppressRef = false;
  });
});
