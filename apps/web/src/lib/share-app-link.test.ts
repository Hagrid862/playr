import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shareOrCopyAppLink, albumPublicUrl } from './share-app-link';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('share-app-link Lib Suite', () => {
  const shareMock = vi.fn();
  const writeTextMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock navigator APIs
    Object.defineProperty(global.navigator, 'share', {
      value: shareMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
  });

  describe('shareOrCopyAppLink', () => {
    it('returns immediately if window is undefined', async () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      try {
        await shareOrCopyAppLink({ title: 'My Album', url: 'https://example.com/url' });
        expect(shareMock).not.toHaveBeenCalled();
        expect(writeTextMock).not.toHaveBeenCalled();
      } finally {
        global.window = originalWindow;
      }
    });

    it('uses navigator.share if available and it succeeds', async () => {
      shareMock.mockResolvedValueOnce(undefined);

      await shareOrCopyAppLink({ title: 'My Album', url: 'https://example.com/url' });

      expect(shareMock).toHaveBeenCalledWith({
        title: 'My Album',
        text: 'My Album',
        url: 'https://example.com/url',
      });
      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it('falls back to clipboard if navigator.share fails', async () => {
      shareMock.mockRejectedValueOnce(new Error('Share cancelled'));
      writeTextMock.mockResolvedValueOnce(undefined);

      await shareOrCopyAppLink({
        title: 'My Album',
        url: 'https://example.com/url',
        copiedToast: 'Custom Copied Toast',
      });

      expect(shareMock).toHaveBeenCalled();
      expect(writeTextMock).toHaveBeenCalledWith('https://example.com/url');
      expect(toast.success).toHaveBeenCalledWith('Custom Copied Toast');
    });

    it('falls back to clipboard if navigator.share is not supported', async () => {
      // @ts-ignore
      delete global.navigator.share;
      writeTextMock.mockResolvedValueOnce(undefined);

      await shareOrCopyAppLink({ title: 'My Album', url: 'https://example.com/url' });

      expect(writeTextMock).toHaveBeenCalledWith('https://example.com/url');
      expect(toast.success).toHaveBeenCalledWith('Link copied to clipboard');
    });

    it('displays error toast if copying to clipboard fails', async () => {
      // @ts-ignore
      delete global.navigator.share;
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeTextMock.mockRejectedValueOnce(new Error('Clipboard failure'));

      await shareOrCopyAppLink({ title: 'My Album', url: 'https://example.com/url' });

      expect(toast.error).toHaveBeenCalledWith('Could not copy link');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('albumPublicUrl', () => {
    it('returns relative path when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      try {
        const url = albumPublicUrl('album-123');
        expect(url).toBe('/app/library/albums/album-123');
      } finally {
        global.window = originalWindow;
      }
    });

    it('returns fully-qualified URL with origin when window is defined', () => {
      const url = albumPublicUrl('album-123');
      expect(url).toBe('http://localhost:3000/app/library/albums/album-123');
    });
  });
});
