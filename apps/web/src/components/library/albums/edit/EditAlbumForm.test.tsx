import type { ZodAlbum } from '@repo/contracts';
import { albumBuilder, customRender } from '@repo/testing';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditAlbumForm } from './EditAlbumForm';
import type { useEditAlbumForm } from './useEditAlbumForm';

type UseEditAlbumFormReturn = ReturnType<typeof useEditAlbumForm>;

vi.mock('./useEditAlbumForm', () => ({
  useEditAlbumForm: vi.fn(({ album }: { album: ZodAlbum }) => {
    const form = {
      handleSubmit: vi.fn(),
    };
    return {
      form,
      coverInputRef: { current: null },
      currentCoverUrl: album.cover?.url,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: vi.fn(),
    };
  }),
}));

vi.mock('./EditAlbumHero', () => ({
  EditAlbumHero: ({
    onCoverClick,
    onRemoveCover,
    currentCoverUrl,
  }: {
    onCoverClick: () => void;
    onRemoveCover: () => void;
    currentCoverUrl?: string | null;
  }) => (
    <div>
      <button onClick={onCoverClick}>Upload Cover</button>
      <button onClick={onRemoveCover}>Remove Cover</button>
      {currentCoverUrl && <img src={currentCoverUrl} alt="Cover Preview" />}
    </div>
  ),
}));

vi.mock('./EditAlbumMetadata', () => ({
  EditAlbumMetadata: () => <div>Metadata Fields</div>,
}));

vi.mock('./EditAlbumModals', () => ({
  EditAlbumModals: () => <div>Modals</div>,
}));

describe('EditAlbumForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    album: { ...albumBuilder(), cover: null },
    isLoading: false,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    customRender(<EditAlbumForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByText('Metadata Fields')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    customRender(<EditAlbumForm {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    customRender(<EditAlbumForm {...defaultProps} isLoading={true} />);
    expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
  });

  it('triggers submit on form submission', async () => {
    const user = userEvent.setup();
    const { useEditAlbumForm: useEditAlbumFormMock } = await import('./useEditAlbumForm');
    const mockForm = { handleSubmit: vi.fn() };
    vi.mocked(useEditAlbumFormMock).mockReturnValue({
      form: mockForm,
      coverInputRef: { current: null },
      currentCoverUrl: null,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: vi.fn(),
    } as unknown as UseEditAlbumFormReturn);

    customRender(<EditAlbumForm {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(mockForm.handleSubmit).toHaveBeenCalled();
  });

  it('handles cover selection via hidden input', async () => {
    const user = userEvent.setup();
    const mockHandleCoverSelect = vi.fn();
    const { useEditAlbumForm: useEditAlbumFormMock } = await import('./useEditAlbumForm');

    vi.mocked(useEditAlbumFormMock).mockReturnValue({
      form: { handleSubmit: vi.fn() },
      coverInputRef: { current: null },
      currentCoverUrl: null,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: mockHandleCoverSelect,
    } as unknown as UseEditAlbumFormReturn);

    customRender(<EditAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    expect(mockHandleCoverSelect).toHaveBeenCalledWith(file);
  });

  it('ignores cover selection when file array is empty', async () => {
    const mockHandleCoverSelect = vi.fn();
    const { useEditAlbumForm: useEditAlbumFormMock } = await import('./useEditAlbumForm');

    vi.mocked(useEditAlbumFormMock).mockReturnValue({
      form: { handleSubmit: vi.fn() },
      coverInputRef: { current: null },
      currentCoverUrl: null,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: mockHandleCoverSelect,
    } as unknown as UseEditAlbumFormReturn);

    customRender(<EditAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(mockHandleCoverSelect).not.toHaveBeenCalled();
  });

  it('calls coverInputRef.current.click() when onCoverClick is triggered', async () => {
    const user = userEvent.setup();
    const { useEditAlbumForm: useEditAlbumFormMock } = await import('./useEditAlbumForm');

    vi.mocked(useEditAlbumFormMock).mockReturnValue({
      form: { handleSubmit: vi.fn() },
      coverInputRef: { current: { click: vi.fn() } },
      currentCoverUrl: null,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: vi.fn(),
    } as unknown as UseEditAlbumFormReturn);

    customRender(<EditAlbumForm {...defaultProps} />);

    // Get the input to verify click was called on it
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(screen.getByText('Upload Cover'));

    expect(clickSpy).toHaveBeenCalled();
  });
});
