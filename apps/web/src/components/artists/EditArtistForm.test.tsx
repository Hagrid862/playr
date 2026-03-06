import {
  UpdateLibraryArtistRequest,
  UpdateLibraryArtistRequestSchema,
  ZodArtist,
  ZodImage,
} from '@repo/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { EditArtistForm } from './EditArtistForm';

// Global mock for URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

describe('EditArtistForm', () => {
  const mockImage: ZodImage = {
    id: 'img-1',
    alt: 'Test Image',
    bucket: 'public',
    key: 'test/key',
    url: 'test.jpg',
    mimeType: 'image/jpeg',
    blurhash: null,
    reportId: null,
    uploadStatus: 'uploaded',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockArtist: ZodArtist = {
    id: '1',
    name: 'Kurt Cobain',
    description: 'Lead singer of Nirvana',
    isCommunity: false,
    verified: true,
    avatarId: 'avatar-123',
    bannerId: 'banner-456',
    avatar: { ...mockImage, id: 'avatar-123', url: 'avatar.jpg' },
    banner: { ...mockImage, id: 'banner-456', url: 'banner.jpg' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    visibility: 'public',
  };

  const mockOnSubmit =
    vi.fn<(values: UpdateLibraryArtistRequest, avatar?: File, banner?: File) => Promise<void>>();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    artist: mockArtist,
    isLoading: false,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with no initial images (placeholders)', () => {
    const artistNoImages: ZodArtist = {
      ...mockArtist,
      avatar: null,
      banner: null,
      avatarId: null,
      bannerId: null,
    };
    render(<EditArtistForm {...defaultProps} artist={artistNoImages} />);

    const images = screen.queryAllByRole('img');
    expect(images.length).toBe(0);
  });

  it('renders correctly with image IDs but no image objects (fallback URLs)', () => {
    const artistWithIdsOnly: ZodArtist = {
      ...mockArtist,
      avatar: null,
      banner: null,
      avatarId: 'id-123',
      bannerId: 'id-456',
    };
    render(<EditArtistForm {...defaultProps} artist={artistWithIdsOnly} />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', '/api/images/id-456'); // Banner fallback
    expect(images[1]).toHaveAttribute('src', '/api/images/id-123'); // Avatar fallback
  });

  it('renders correctly with initial values', () => {
    render(<EditArtistForm {...defaultProps} />);

    expect(screen.getByLabelText(/Artist Name/i)).toHaveValue('Kurt Cobain');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Lead singer of Nirvana');
    expect(screen.getByText(/Artist Media/i)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<EditArtistForm {...defaultProps} />);
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows validation error when name is empty and touched', async () => {
    const user = userEvent.setup();
    render(<EditArtistForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Artist Name/i);
    await user.clear(nameInput);
    await user.tab(); // Blur the input

    expect(await screen.findByText('Artist name cannot be empty')).toBeInTheDocument();
  });

  it('displays server errors if provided even if not touched', () => {
    const serverErrors: Partial<Record<keyof UpdateLibraryArtistRequest, string>> = {
      name: 'Server error name',
    };
    render(<EditArtistForm {...defaultProps} serverErrors={serverErrors} />);

    expect(screen.getByText('Server error name')).toBeInTheDocument();
  });

  it('handles duplicate server validation errors in validateWithZod', async () => {
    const spy = vi.spyOn(UpdateLibraryArtistRequestSchema, 'safeParse').mockReturnValue({
      success: false,
      error: new z.ZodError([
        { path: ['name'], message: 'Error 1', code: 'custom' },
        { path: ['name'], message: 'Error 2', code: 'custom' },
      ]),
    } as ReturnType<typeof UpdateLibraryArtistRequestSchema.safeParse>);

    render(<EditArtistForm {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Artist Name/i);
    fireEvent.change(nameInput, { target: { value: 'trigger' } });
    fireEvent.blur(nameInput);

    expect(await screen.findByText('Error 1')).toBeInTheDocument();
    expect(screen.queryByText('Error 2')).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('displays form-level errors for description when touched', async () => {
    const user = userEvent.setup();
    render(
      <EditArtistForm
        {...defaultProps}
        serverErrors={{ description: 'Server description error' }}
      />,
    );
    expect(screen.getByText('Server description error')).toBeInTheDocument();

    const descInput = screen.getByLabelText(/Description/i);
    await user.type(descInput, 'a');
    await user.tab();
    expect(screen.queryByText('Server description error')).not.toBeInTheDocument();
  });

  it('handles empty value in description validator', async () => {
    const user = userEvent.setup();
    render(<EditArtistForm {...defaultProps} artist={{ ...mockArtist, description: null }} />);
    const descInput = screen.getByLabelText(/Description/i);
    await user.type(descInput, 'a');
    await user.tab();
    // No error expected
  });

  it('handles avatar selection', async () => {
    render(<EditArtistForm {...defaultProps} />);
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const avatarInput = fileInputs[0];

    fireEvent.change(avatarInput, { target: { files: [file] } });

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images.some((img) => img.getAttribute('src') === 'mock-url')).toBe(true);
    });
  });

  it('handles banner selection', async () => {
    const user = userEvent.setup();
    const artistNoBanner: ZodArtist = { ...mockArtist, banner: null, bannerId: null };
    render(<EditArtistForm {...defaultProps} artist={artistNoBanner} />);

    const file = new File(['hello'], 'banner.png', { type: 'image/png' });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const bannerInput = fileInputs[1] as HTMLInputElement;

    await user.upload(bannerInput, file);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', 'mock-url');
  });

  it('submits form with selected files', async () => {
    const user = userEvent.setup();
    render(<EditArtistForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Artist Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Dave Grohl');

    const avatarFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const bannerFile = new File(['banner'], 'banner.png', { type: 'image/png' });

    const fileInputs = document.querySelectorAll('input[type="file"]');
    await user.upload(fileInputs[0] as HTMLInputElement, avatarFile);
    await user.upload(fileInputs[1] as HTMLInputElement, bannerFile);

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Dave Grohl' }),
        avatarFile,
        bannerFile,
      );
    });
  });

  it('shows loading state on save button', () => {
    render(<EditArtistForm {...defaultProps} isLoading={true} />);
    expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
  });

  it('triggers click on file inputs when clicking visual elements', async () => {
    const user = userEvent.setup();
    render(<EditArtistForm {...defaultProps} />);

    const avatarInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const bannerInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;

    const avatarSpy = vi.spyOn(avatarInput, 'click');
    const bannerSpy = vi.spyOn(bannerInput, 'click');

    await user.click(screen.getByText(/Change Photo/i));
    expect(avatarSpy).toHaveBeenCalled();

    await user.click(screen.getByText(/Change Banner/i));
    expect(bannerSpy).toHaveBeenCalled();
  });

  it('handles cancelling file selections without initial IDs', () => {
    const artistNoMedia: ZodArtist = {
      ...mockArtist,
      avatarId: null,
      bannerId: null,
      avatar: null,
      banner: null,
    };
    render(<EditArtistForm {...defaultProps} artist={artistNoMedia} />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0], { target: { files: [] } });
    fireEvent.change(fileInputs[1], { target: { files: [] } });
  });

  it('handles cancelling file selections with initial IDs', () => {
    render(<EditArtistForm {...defaultProps} />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0], { target: { files: [] } });
    fireEvent.change(fileInputs[1], { target: { files: [] } });
  });

  it('shows no error when valid name is blurred', () => {
    render(<EditArtistForm {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Artist Name/i);
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    fireEvent.blur(nameInput);
    expect(screen.queryByText('Artist name cannot be empty')).not.toBeInTheDocument();
  });

  it('handles field-level validation for long description', async () => {
    const user = userEvent.setup();
    render(<EditArtistForm {...defaultProps} />);
    const descInput = screen.getByLabelText(/Description/i);

    fireEvent.change(descInput, { target: { value: 'a'.repeat(2050) } });
    await user.tab();

    expect(
      await screen.findByText('Description must be 2048 characters or less'),
    ).toBeInTheDocument();
  });

  it('handles null description value in validator', () => {
    const artistWithNullDesc = { ...mockArtist, description: null };
    render(
      <EditArtistForm {...defaultProps} artist={artistWithNullDesc as unknown as ZodArtist} />,
    );
    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: null } });
    fireEvent.blur(descInput);
  });

  it('shows drag overlay when dragging files over window', () => {
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop image to update Avatar/i)).toBeInTheDocument();
  });

  it('hides drag overlay when dragging leaves window', () => {
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop image to update Avatar/i)).toBeInTheDocument();
    fireEvent.dragLeave(window, { dataTransfer: {} });
    expect(screen.queryByText(/Drop image to update Avatar/i)).not.toBeInTheDocument();
  });

  it('keeps drag overlay visible during nested drag events', () => {
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop image to update Avatar/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer: {} });
    expect(screen.getByText(/Drop image to update Avatar/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer: {} });
    expect(screen.queryByText(/Drop image to update Avatar/i)).not.toBeInTheDocument();
  });

  it('updates avatar preview when dropping single valid image file', () => {
    render(<EditArtistForm {...defaultProps} />);
    const avatarInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const filesDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'files',
    ) as PropertyDescriptor;
    Object.defineProperty(avatarInput, 'files', {
      ...filesDescriptor,
      set: () => {},
      configurable: true,
    });

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    const images = screen.getAllByRole('img');
    expect(images.some((img) => img.getAttribute('src') === 'mock-url')).toBe(true);
  });

  it('hides drag overlay when drop occurs and syncs avatar file input', () => {
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop image to update Avatar/i)).toBeInTheDocument();

    const avatarInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const filesDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'files',
    ) as PropertyDescriptor;
    const filesSetSpy = vi.fn();
    Object.defineProperty(avatarInput, 'files', {
      ...filesDescriptor,
      set: filesSetSpy,
      configurable: true,
    });

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.queryByText(/Drop image to update Avatar/i)).not.toBeInTheDocument();
    expect(filesSetSpy).toHaveBeenCalled();
  });

  it('shows Too Many Files dialog when dropping multiple files', () => {
    render(<EditArtistForm {...defaultProps} />);
    const file1 = new File(['x'], 'a.png', { type: 'image/png' });
    const file2 = new File(['y'], 'b.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file1, file2] } });
    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
  });

  it('shows Invalid File Format dialog when dropping non-image file', () => {
    render(<EditArtistForm {...defaultProps} />);
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });
    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
  });

  it('closes Too Many Files dialog when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.drop(window, {
      dataTransfer: {
        files: [
          new File(['x'], 'a.png', { type: 'image/png' }),
          new File(['y'], 'b.png', { type: 'image/png' }),
        ],
      },
    });
    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^OK$/i }));
    expect(screen.queryByText(/Too Many Files/i)).not.toBeInTheDocument();
  });

  it('closes Invalid File Format dialog when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.drop(window, {
      dataTransfer: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] },
    });
    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^OK$/i }));
    expect(screen.queryByText(/Invalid File Format/i)).not.toBeInTheDocument();
  });

  it('does not set dragging when dragenter has no items', () => {
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [], files: [] } });
    expect(screen.queryByText(/Drop image to update Avatar/i)).not.toBeInTheDocument();
  });

  it('handles dragover event', () => {
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.dragOver(window, { dataTransfer: { items: [] } });
    expect(screen.getByLabelText(/Artist Name/i)).toBeInTheDocument();
  });

  it('handles drop with no files', () => {
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop image to update Avatar/i)).toBeInTheDocument();

    fireEvent.drop(window, { dataTransfer: { files: [] } });

    expect(screen.queryByText(/Drop image to update Avatar/i)).not.toBeInTheDocument();
  });

  it('handles drop with undefined dataTransfer', () => {
    render(<EditArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    fireEvent.drop(window, { dataTransfer: undefined } as unknown as DragEvent);

    expect(screen.queryByText(/Drop image to update Avatar/i)).not.toBeInTheDocument();
  });

  it('handles drop when avatar input ref is null', () => {
    render(<EditArtistForm {...defaultProps} _testHideAvatarInput />);

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    const images = screen.getAllByRole('img');
    expect(images.some((img) => img.getAttribute('src') === 'mock-url')).toBe(true);
  });
});
