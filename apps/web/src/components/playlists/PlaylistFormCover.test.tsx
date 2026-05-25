import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { PlaylistFormCover, PlaylistFormCoverProps } from './PlaylistFormCover';

describe('PlaylistFormCover', () => {
  const defaultProps = (): PlaylistFormCoverProps => ({
    id: 'cover-input',
    coverInputRef: createRef<HTMLInputElement | null>(),
    disabled: false,
    displayUrl: null,
    hasSavedCover: false,
    removalPending: false,
    hasNewFile: false,
    onPickFiles: vi.fn(),
    onDiscardNewFile: vi.fn(),
    onScheduleRemoveSavedCover: vi.fn(),
    onUndoRemoval: vi.fn(),
  });

  it('renders default placeholder when no cover is present', () => {
    customRender(<PlaylistFormCover {...defaultProps()} />);

    expect(screen.getByText('Add image')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders displayUrl when provided', () => {
    const props = defaultProps();
    props.displayUrl = 'https://example.com/cover.jpg';

    const { container } = customRender(<PlaylistFormCover {...props} />);

    const images = container.querySelectorAll('img');
    // First image is background blur glow, second is primary cover
    expect(images.length).toBe(2);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(images[1]).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('triggers coverInput ref click when clicking the cover button', () => {
    const props = defaultProps();

    const { container } = customRender(<PlaylistFormCover {...props} />);

    const input = container.querySelector('#cover-input') as HTMLInputElement;
    const mockClick = vi.fn();
    input.click = mockClick;

    const btn = screen.getByRole('button', { name: /Add image/i });
    fireEvent.click(btn);
    expect(mockClick).toHaveBeenCalled();
  });

  it('triggers onPickFiles when input files change', () => {
    const props = defaultProps();
    customRender(<PlaylistFormCover {...props} />);

    const input = document.getElementById('cover-input') as HTMLInputElement;
    const file = new File(['hello'], 'cover.png', { type: 'image/png' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true,
      configurable: true,
    });

    fireEvent.change(input);
    expect(props.onPickFiles).toHaveBeenCalledWith(file);
  });

  it('triggers onPickFiles with null when input files change to null or empty', () => {
    const props = defaultProps();
    customRender(<PlaylistFormCover {...props} />);

    const input = document.getElementById('cover-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: null,
      writable: true,
      configurable: true,
    });

    fireEvent.change(input);
    expect(props.onPickFiles).toHaveBeenCalledWith(null);
  });

  it('handles removal pending state', () => {
    const props = defaultProps();
    props.removalPending = true;

    customRender(<PlaylistFormCover {...props} />);

    expect(screen.getByText('Removed when you save')).toBeInTheDocument();
    expect(screen.getByText('Or tap to pick a new image')).toBeInTheDocument();
  });

  it('renders discard button when hasNewFile is true', () => {
    const props = defaultProps();
    props.hasNewFile = true;

    customRender(<PlaylistFormCover {...props} />);

    const discardBtn = screen.getByRole('button', { name: /Discard new image/i });
    fireEvent.click(discardBtn);
    expect(props.onDiscardNewFile).toHaveBeenCalled();
  });

  it('renders remove cover button when showRemoveSaved is true', () => {
    const props = defaultProps();
    props.hasSavedCover = true;
    props.hasNewFile = false;
    props.removalPending = false;

    customRender(<PlaylistFormCover {...props} />);

    const removeBtn = screen.getByRole('button', { name: /Remove cover/i });
    fireEvent.click(removeBtn);
    expect(props.onScheduleRemoveSavedCover).toHaveBeenCalled();
  });

  it('renders undo button when showUndo is true', () => {
    const props = defaultProps();
    props.removalPending = true;

    customRender(<PlaylistFormCover {...props} />);

    const undoBtn = screen.getByRole('button', { name: /Undo remove/i });
    fireEvent.click(undoBtn);
    expect(props.onUndoRemoval).toHaveBeenCalled();
  });

  it('respects disabled state', () => {
    const props = defaultProps();
    props.disabled = true;
    props.hasNewFile = true;

    customRender(<PlaylistFormCover {...props} />);

    const mainBtn = screen.getByRole('button', { name: /Add image/i });
    expect(mainBtn).toBeDisabled();

    const discardBtn = screen.getByRole('button', { name: /Discard new image/i });
    expect(discardBtn).toBeDisabled();
  });
});
