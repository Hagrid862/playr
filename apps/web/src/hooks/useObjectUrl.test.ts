import { customRenderHook } from '@repo/testing/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useObjectUrl } from './useObjectUrl';

describe('useObjectUrl Hook Suite', () => {
  const createObjectURLMock = vi.fn((file: File) => `blob:https://example.com/${file.name}`);
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null if file is undefined or null', () => {
    const { result, rerender } = customRenderHook(({ file }) => useObjectUrl(file), {
      initialProps: { file: null as File | null | undefined },
    });

    expect(result.current).toBeNull();
    expect(createObjectURLMock).not.toHaveBeenCalled();

    rerender({ file: undefined });
    expect(result.current).toBeNull();
    expect(createObjectURLMock).not.toHaveBeenCalled();
  });

  it('creates and revokes object URL correctly when file is supplied, modified, and unmounted', () => {
    const file1 = new File(['data1'], 'music1.mp3', { type: 'audio/mpeg' });
    const file2 = new File(['data2'], 'music2.mp3', { type: 'audio/mpeg' });

    const { result, rerender, unmount } = customRenderHook(({ file }) => useObjectUrl(file), {
      initialProps: { file: file1 as File | null | undefined },
    });

    expect(result.current).toBe('blob:https://example.com/music1.mp3');
    expect(createObjectURLMock).toHaveBeenCalledWith(file1);

    // Rerender with file2
    rerender({ file: file2 });
    expect(result.current).toBe('blob:https://example.com/music2.mp3');
    expect(createObjectURLMock).toReturnWith('blob:https://example.com/music2.mp3');
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:https://example.com/music1.mp3');

    // Unmount
    unmount();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:https://example.com/music2.mp3');
  });
});
