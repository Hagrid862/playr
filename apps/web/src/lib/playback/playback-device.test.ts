import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectDesktopBrowserFromUserAgent,
  getLocalPlaybackDeviceMetadata,
  getOrCreatePlaybackDeviceId,
} from './playback-device';

describe('playback/playback-device', () => {
  describe('detectDesktopBrowserFromUserAgent', () => {
    it('detects Edge', () => {
      expect(detectDesktopBrowserFromUserAgent('Mozilla/5.0 ... Edg/123.0')).toBe('Edge');
    });

    it('detects Brave', () => {
      expect(detectDesktopBrowserFromUserAgent('Mozilla/5.0 ... Brave/1.2.3')).toBe('Brave');
    });

    it('detects Firefox', () => {
      expect(detectDesktopBrowserFromUserAgent('Mozilla/5.0 ... Firefox/123.0')).toBe('Firefox');
    });

    it('detects Chrome', () => {
      expect(detectDesktopBrowserFromUserAgent('Mozilla/5.0 ... Chrome/123.0')).toBe('Chrome');
    });

    it('detects Chromium', () => {
      expect(detectDesktopBrowserFromUserAgent('Mozilla/5.0 ... Chromium/123.0')).toBe('Chrome');
    });

    it('detects Safari', () => {
      expect(detectDesktopBrowserFromUserAgent('Mozilla/5.0 ... Safari/605.1')).toBe('Safari');
    });

    it('returns unknown for others', () => {
      expect(detectDesktopBrowserFromUserAgent('Mozilla/5.0 ... Unknown/1.0')).toBe(
        'Web Player (unknown)',
      );
    });
  });

  describe('getOrCreatePlaybackDeviceId', () => {
    beforeEach(() => {
      vi.stubGlobal('window', {
        sessionStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
        },
      });
      vi.stubGlobal('crypto', {
        randomUUID: vi.fn(() => 'test-uuid'),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns server-render if window is undefined', () => {
      vi.stubGlobal('window', undefined);
      expect(getOrCreatePlaybackDeviceId()).toBe('server-render');
    });

    it('returns existing id from sessionStorage', () => {
      vi.mocked(window.sessionStorage.getItem).mockReturnValue('existing-id');
      expect(getOrCreatePlaybackDeviceId()).toBe('existing-id');
      expect(window.sessionStorage.getItem).toHaveBeenCalledWith('playr_playback_device_id');
    });

    it('creates and stores new id if none exists', () => {
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(null);
      expect(getOrCreatePlaybackDeviceId()).toBe('test-uuid');
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'playr_playback_device_id',
        'test-uuid',
      );
    });
  });

  describe('getLocalPlaybackDeviceMetadata', () => {
    beforeEach(() => {
      vi.stubGlobal('window', {
        sessionStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
        },
      });
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 ... Chrome/123.0',
      });
      vi.stubGlobal('crypto', {
        randomUUID: vi.fn(() => 'test-uuid'),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns correct metadata for desktop', () => {
      const metadata = getLocalPlaybackDeviceMetadata();
      expect(metadata).toEqual({
        playbackDeviceId: 'test-uuid',
        deviceName: 'Chrome',
        deviceIcon: 'desktop',
      });
    });

    it('returns correct metadata for mobile', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 ... Mobile ... Safari/605.1',
      });
      const metadata = getLocalPlaybackDeviceMetadata();
      expect(metadata).toEqual({
        playbackDeviceId: 'test-uuid',
        deviceName: 'Web Player (Mobile)',
        deviceIcon: 'mobile',
      });
    });

    it('returns unknown metadata if navigator is undefined', () => {
      vi.stubGlobal('navigator', undefined);
      const metadata = getLocalPlaybackDeviceMetadata();
      expect(metadata.deviceName).toBe('Web Player (unknown)');
      expect(metadata.deviceIcon).toBe('desktop');
    });
  });
});
