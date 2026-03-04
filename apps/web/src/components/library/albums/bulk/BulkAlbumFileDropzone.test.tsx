import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BulkAlbumFileDropzone } from './BulkAlbumFileDropzone';

describe('BulkAlbumFileDropzone', () => {
  const mockOnFilesAdded = vi.fn();
  const createFileInputRef = () => ({ current: null as HTMLInputElement | null });

  beforeEach(() => {
    mockOnFilesAdded.mockClear();
  });

  it('renders empty state when tracksCount is 0', () => {
    const fileInputRef = createFileInputRef();
    render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    expect(screen.getByText('Drop audio files here or click to select')).toBeInTheDocument();
    expect(screen.getByText('Supports MP3, WAV, FLAC, AAC, and other audio formats')).toBeInTheDocument();
  });

  it('renders add-more state when tracksCount > 0', () => {
    const fileInputRef = createFileInputRef();
    render(
      <BulkAlbumFileDropzone
        tracksCount={3}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    expect(screen.getByText('Drop more files or click to add')).toBeInTheDocument();
    expect(screen.queryByText('Drop audio files here or click to select')).not.toBeInTheDocument();
  });

  it('applies dragging styles on dragOver', () => {
    const fileInputRef = createFileInputRef();
    const { container } = render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const dropzone = container.firstChild as HTMLElement;
    expect(dropzone.className).not.toContain('border-primary');

    fireEvent.dragOver(dropzone, { dataTransfer: { files: [] } });

    expect(dropzone.className).toContain('border-primary');
    expect(dropzone.className).toContain('bg-primary/10');
  });

  it('clears dragging state on drop', () => {
    const fileInputRef = createFileInputRef();
    const { container } = render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const dropzone = container.firstChild as HTMLElement;
    fireEvent.dragOver(dropzone, { dataTransfer: { files: [] } });
    expect(dropzone.className).toContain('border-primary');

    fireEvent.drop(dropzone, { dataTransfer: { files: [] } });
    expect(dropzone.className).not.toContain('border-primary');
  });

  it('calls onFilesAdded when files are dropped', () => {
    const fileInputRef = createFileInputRef();
    const { container } = render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const dropzone = container.firstChild as HTMLElement;
    const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
    const fileList = Object.assign([file], { length: 1, item: (i: number) => file }) as FileList;

    fireEvent.drop(dropzone, { dataTransfer: { files: fileList } });

    expect(mockOnFilesAdded).toHaveBeenCalledWith(fileList);
  });

  it('calls onFilesAdded when drop has no files', () => {
    const fileInputRef = createFileInputRef();
    const { container } = render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const dropzone = container.firstChild as HTMLElement;
    fireEvent.drop(dropzone, { dataTransfer: {} });

    expect(mockOnFilesAdded).toHaveBeenCalled();
    const arg = mockOnFilesAdded.mock.calls[0][0];
    expect(arg === null || (Array.isArray(arg) && arg.length === 0) || arg?.length === 0).toBe(true);
  });

  it('calls onFilesAdded with null when dataTransfer has no files', () => {
    const fileInputRef = createFileInputRef();
    const { container } = render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const dropzone = container.firstChild as HTMLElement;
    fireEvent.drop(dropzone, { dataTransfer: { files: undefined } });

    expect(mockOnFilesAdded).toHaveBeenCalledWith(null);
  });

  it('keeps dragging state on dragLeave when relatedTarget is inside dropzone', () => {
    const fileInputRef = createFileInputRef();
    const { container } = render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const dropzone = container.firstChild as HTMLElement;
    const innerContent = screen.getByText('Drop audio files here or click to select')
      .closest('div') as HTMLElement;
    fireEvent.dragOver(dropzone, { dataTransfer: {} });
    expect(dropzone.className).toContain('border-primary');

    const dragLeaveEvent = new Event('dragleave', { bubbles: true });
    Object.defineProperty(dragLeaveEvent, 'relatedTarget', {
      value: innerContent,
      configurable: true,
    });
    dropzone.dispatchEvent(dragLeaveEvent);
    expect(dropzone.className).toContain('border-primary');
  });

  it('clears dragging state on dragLeave when relatedTarget is outside', () => {
    const fileInputRef = createFileInputRef();
    const { container } = render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const dropzone = container.firstChild as HTMLElement;
    fireEvent.dragOver(dropzone, { dataTransfer: {} });
    expect(dropzone.className).toContain('border-primary');

    fireEvent.dragLeave(dropzone, {
      relatedTarget: document.body,
      currentTarget: dropzone,
    });
    expect(dropzone.className).not.toContain('border-primary');
  });

  it('calls onFilesAdded when file input changes', async () => {
    const fileInputRef = createFileInputRef();
    render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
    await userEvent.upload(fileInput, file);

    expect(mockOnFilesAdded).toHaveBeenCalledWith(
      expect.objectContaining({ 0: file, length: 1 }),
    );
    expect(fileInput.value).toBe('');
  });

  it('triggers file input click when dropzone is clicked', () => {
    const fileInputRef = createFileInputRef();
    render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInputRef, 'current', { value: fileInput, configurable: true });
    fileInputRef.current = fileInput;

    const clickSpy = vi.spyOn(fileInput, 'click');
    const dropzone = screen.getByText('Drop audio files here or click to select').closest('div');
    fireEvent.click(dropzone!);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('input has correct attributes', () => {
    const fileInputRef = createFileInputRef();
    render(
      <BulkAlbumFileDropzone
        tracksCount={0}
        onFilesAdded={mockOnFilesAdded}
        fileInputRef={fileInputRef}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', 'audio/*');
    expect(fileInput).toHaveAttribute('multiple');
  });
});
