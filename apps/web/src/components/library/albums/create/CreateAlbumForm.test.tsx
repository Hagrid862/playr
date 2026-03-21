import { AlbumType } from '@repo/db';
import { customRender } from '@repo/testing';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CreateAlbumForm } from './CreateAlbumForm';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

class MockDataTransfer {
  items = {
    add: vi.fn(),
  };
  files: File[] = [];
}
global.DataTransfer = MockDataTransfer as unknown as typeof DataTransfer;

vi.mock('./CreateAlbumDetails', () => ({
  CreateAlbumDetails: ({
    onChange,
    onBlur,
    onCoverClick,
    onRemoveImage,
    previewUrl,
  }: {
    onChange: (field: string, value: string | Date | null) => void;
    onBlur: (field: string) => void;
    onCoverClick: () => void;
    onRemoveImage: () => void;
    previewUrl: string | null;
  }) => (
    <div>
      <button onClick={() => onChange('name', 'New Name')}>Change Name</button>
      <button onClick={() => onBlur('name')}>Blur Name</button>
      <button onClick={onCoverClick}>Upload Cover</button>
      {previewUrl && <img src={previewUrl} alt="Cover Preview" />}
      {previewUrl && <button onClick={onRemoveImage}>Remove</button>}
    </div>
  ),
}));

vi.mock('./CreateAlbumModals', () => ({
  CreateAlbumModals: ({
    isFormatModalOpen,
    isMultipleFilesModalOpen,
  }: {
    isFormatModalOpen: boolean;
    isMultipleFilesModalOpen: boolean;
  }) => (
    <div>
      {isFormatModalOpen && <div>Invalid File Format</div>}
      {isMultipleFilesModalOpen && <div>Too Many Files</div>}
    </div>
  ),
}));

describe('CreateAlbumForm', () => {
  const mockOnSubmit = vi.fn((e) => e.preventDefault());
  const mockOnChange = vi.fn();
  const mockOnBlur = vi.fn();
  const mockGetFieldError = vi.fn();
  const mockOnFileSelect = vi.fn();

  const defaultProps = {
    formData: {
      name: '',
      description: '',
      type: AlbumType.album,
      artistId: 'artist-123',
      releaseDate: null,
    },
    isLoading: false,
    isValid: true,
    onSubmit: mockOnSubmit,
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    getFieldError: mockGetFieldError,
    onFileSelect: mockOnFileSelect,
  };

  it('renders correctly', () => {
    customRender(<CreateAlbumForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Create Album/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('handles field changes via detailed component', async () => {
    const user = userEvent.setup();
    customRender(<CreateAlbumForm {...defaultProps} />);
    await user.click(screen.getByText('Change Name'));
    expect(mockOnChange).toHaveBeenCalledWith('name', 'New Name');
  });

  it('handles field blur via detailed component', async () => {
    const user = userEvent.setup();
    customRender(<CreateAlbumForm {...defaultProps} />);
    await user.click(screen.getByText('Blur Name'));
    expect(mockOnBlur).toHaveBeenCalledWith('name');
  });

  it('shows loading state', () => {
    customRender(<CreateAlbumForm {...defaultProps} isLoading={true} />);
    expect(screen.getByText(/Creating.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
  });

  it('disables submit button when form is invalid', () => {
    customRender(<CreateAlbumForm {...defaultProps} isValid={false} />);
    expect(screen.getByRole('button', { name: /Create Album/i })).toBeDisabled();
  });

  it('handles file selection and preview', async () => {
    const user = userEvent.setup();
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    customRender(<CreateAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['blob'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    expect(createObjectUrlSpy).toHaveBeenCalledWith(file);
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    expect(screen.getByAltText('Cover Preview')).toHaveAttribute('src', 'mock-url');
  });

  it('handles file removal', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    customRender(<CreateAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['blob'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    const removeButton = screen.getByRole('button', { name: /Remove/i });
    await user.click(removeButton);

    expect(screen.queryByAltText('Cover Preview')).not.toBeInTheDocument();
    expect(mockOnFileSelect).toHaveBeenLastCalledWith(null);
  });

  it('triggers click on hidden file input when cover container is clicked', () => {
    customRender(<CreateAlbumForm {...defaultProps} />);
    const coverContainer = screen.getByText(/Upload Cover/i);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(coverContainer);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('shows Invalid File Format dialog when dropping non-image file', () => {
    customRender(<CreateAlbumForm {...defaultProps} />);
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
  });

  it('shows Too Many Files dialog when dropping multiple files', () => {
    customRender(<CreateAlbumForm {...defaultProps} />);
    const file1 = new File(['x'], 'a.png', { type: 'image/png' });
    const file2 = new File(['y'], 'b.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file1, file2] } });

    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
  });

  it('handles removing file selection via input onChange', () => {
    customRender(<CreateAlbumForm {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [] } });

    expect(mockOnFileSelect).toHaveBeenCalledWith(null);
  });

  it('processes dropped image files and updates file input with DataTransfer', () => {
    const originalFilesDesc = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'files',
    );
    Object.defineProperty(window.HTMLInputElement.prototype, 'files', {
      set: vi.fn(),
      configurable: true,
    });

    customRender(<CreateAlbumForm {...defaultProps} />);
    const file = new File(['image'], 'test.png', { type: 'image/png' });

    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);

    if (originalFilesDesc) {
      Object.defineProperty(window.HTMLInputElement.prototype, 'files', originalFilesDesc);
    }
  });

  it('handles file operations when fileInputRef.current is null', () => {
    // This covers the false branches of `if (fileInputRef.current)`
    customRender(<CreateAlbumForm {...defaultProps} _testHideFileInput={true} />);

    // Simulate drop
    const file = new File(['image'], 'test.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('handles remove image when fileInputRef.current is null', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    // we need to set a file so that the remove button appears
    customRender(<CreateAlbumForm {...defaultProps} _testHideFileInput={true} />);

    // Bypass the visual upload and just drop it to set the preview
    const file = new File(['blob'], 'test.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    const removeButton = await screen.findByRole('button', { name: /Remove/i });
    await user.click(removeButton);

    expect(screen.queryByAltText('Cover Preview')).not.toBeInTheDocument();
  });
});
