import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumAudioDropCard } from './AlbumAudioDropCard';

describe('AlbumAudioDropCard', () => {
  const onAddFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes onAddFiles when files are selected from the hidden input', async () => {
    const user = userEvent.setup();
    const fileInputRef = createRef<HTMLInputElement>();
    const audio = new File(['x'], 'a.mp3', { type: 'audio/mpeg' });

    customRender(<AlbumAudioDropCard fileInputRef={fileInputRef} onAddFiles={onAddFiles} />);

    const input = fileInputRef.current;
    expect(input).toBeTruthy();
    await user.upload(input!, audio);

    expect(onAddFiles).toHaveBeenCalled();
    const list = onAddFiles.mock.calls[0]?.[0] as FileList;
    expect(list?.[0]?.name).toBe('a.mp3');
  });

  it('invokes onAddFiles on drop with dataTransfer files', () => {
    const fileInputRef = createRef<HTMLInputElement>();
    const audio = new File(['x'], 'b.mp3', { type: 'audio/mpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(audio);

    customRender(<AlbumAudioDropCard fileInputRef={fileInputRef} onAddFiles={onAddFiles} />);

    const dropzone = screen.getByRole('button', {
      name: /click here or drop audio files/i,
    }).parentElement;
    expect(dropzone).toBeTruthy();

    fireEvent.drop(dropzone!, { dataTransfer });
    expect(onAddFiles).toHaveBeenCalled();
  });

  it('toggles drag styling and resets counter after drop', () => {
    const fileInputRef = createRef<HTMLInputElement>();
    const audio = new File(['x'], 'c.mp3', { type: 'audio/mpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(audio);

    customRender(
      <AlbumAudioDropCard fileInputRef={fileInputRef} onAddFiles={onAddFiles} compact />,
    );

    const dropzone = screen.getByRole('button', {
      name: /click here or drop audio files/i,
    }).parentElement!;

    fireEvent.dragEnter(dropzone);
    fireEvent.dragEnter(dropzone);
    fireEvent.dragLeave(dropzone);
    fireEvent.dragLeave(dropzone);
    fireEvent.drop(dropzone, { dataTransfer });

    expect(onAddFiles).toHaveBeenCalled();
  });

  it('invokes onDragOver without throwing', () => {
    const fileInputRef = createRef<HTMLInputElement>();
    customRender(<AlbumAudioDropCard fileInputRef={fileInputRef} onAddFiles={onAddFiles} />);
    const dropzone = screen.getByRole('button', {
      name: /click here or drop audio files/i,
    }).parentElement!;
    fireEvent.dragOver(dropzone);
    expect(onAddFiles).not.toHaveBeenCalled();
  });

  it('does not call onAddFiles when drop has no files', () => {
    const fileInputRef = createRef<HTMLInputElement>();
    const dataTransfer = new DataTransfer();

    customRender(<AlbumAudioDropCard fileInputRef={fileInputRef} onAddFiles={onAddFiles} />);

    const dropzone = screen.getByRole('button', {
      name: /click here or drop audio files/i,
    }).parentElement!;
    fireEvent.drop(dropzone, { dataTransfer });

    expect(onAddFiles).not.toHaveBeenCalled();
  });

  it('handles trigger click when file input ref target is cleared', async () => {
    const user = userEvent.setup();
    const ref = { current: null as HTMLInputElement | null };

    customRender(<AlbumAudioDropCard fileInputRef={ref} onAddFiles={onAddFiles} />);

    ref.current = null;

    await user.click(screen.getByRole('button', { name: /click here or drop audio files/i }));
    expect(onAddFiles).not.toHaveBeenCalled();
  });
});
