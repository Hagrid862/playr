import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('music-metadata', () => ({
  parseBlob: vi.fn(),
  selectCover: vi.fn(),
}));

import type { IPicture } from 'music-metadata';
import { parseBlob, selectCover } from 'music-metadata';
import {
  extractCoverFromAudioFile,
  extractMetadataFromAudioFile,
  parseReleaseDate,
} from './audio-metadata';

describe('audio-metadata', () => {
  const createFile = (name = 'test.mp3') => new File(['audio'], name, { type: 'audio/mpeg' });

  beforeEach(() => {
    vi.mocked(parseBlob).mockReset();
    vi.mocked(selectCover).mockReset();
  });

  describe('extractMetadataFromAudioFile', () => {
    it('extracts metadata from audio file', async () => {
      vi.mocked(parseBlob).mockResolvedValue({
        common: {
          album: ' Nevermind ',
          artist: ' Nirvana ',
          title: ' Smells Like Teen Spirit ',
          track: { no: 1 },
          disk: { no: 1 },
          year: 1991,
          date: ' 1991-09-24 ',
        },
      } as never);

      const result = await extractMetadataFromAudioFile(createFile());

      expect(result).toEqual({
        album: 'Nevermind',
        artist: 'Nirvana',
        title: 'Smells Like Teen Spirit',
        trackNo: 1,
        diskNo: 1,
        year: 1991,
        date: '1991-09-24',
      });
    });

    it('returns undefined for missing optional fields', async () => {
      vi.mocked(parseBlob).mockResolvedValue({
        common: {
          album: undefined,
          artist: undefined,
          title: undefined,
          track: undefined,
          disk: undefined,
          year: undefined,
          date: undefined,
        },
      } as never);

      const result = await extractMetadataFromAudioFile(createFile());

      expect(result).toEqual({
        album: undefined,
        artist: undefined,
        title: undefined,
        trackNo: undefined,
        diskNo: undefined,
        year: undefined,
        date: undefined,
      });
    });

    it('returns null when parseBlob throws', async () => {
      vi.mocked(parseBlob).mockRejectedValue(new Error('Parse failed'));

      const result = await extractMetadataFromAudioFile(createFile());

      expect(result).toBeNull();
    });
  });

  describe('extractCoverFromAudioFile', () => {
    it('extracts cover art and returns File', async () => {
      const pictureData = new Uint8Array([0xff, 0xd8, 0xff]);
      vi.mocked(parseBlob).mockResolvedValue({
        common: { picture: [{ data: pictureData, format: 'image/jpeg' }] },
      } as never);
      vi.mocked(selectCover).mockReturnValue({
        data: pictureData,
        format: 'image/jpeg',
      });

      const result = await extractCoverFromAudioFile(createFile());

      expect(result).toBeInstanceOf(File);
      expect(result?.name).toBe('cover.jpeg');
      expect(result?.type).toBe('image/jpeg');
      expect(result?.size).toBe(3);
    });

    it('uses fallback extension jpg when format has no subtype', async () => {
      const pictureData = new Uint8Array([0xff]);
      vi.mocked(parseBlob).mockResolvedValue({
        common: { picture: [{ data: pictureData, format: 'image' }] },
      } as never);
      vi.mocked(selectCover).mockReturnValue({
        data: pictureData,
        format: 'image',
      });

      const result = await extractCoverFromAudioFile(createFile());

      expect(result?.name).toBe('cover.jpg');
      expect(result?.type).toBe('image');
    });

    it('returns null when no picture data', async () => {
      vi.mocked(parseBlob).mockResolvedValue({
        common: { picture: [] },
      } as never);
      vi.mocked(selectCover).mockReturnValue(null);

      const result = await extractCoverFromAudioFile(createFile());

      expect(result).toBeNull();
    });

    it('returns null when picture has no data', async () => {
      vi.mocked(parseBlob).mockResolvedValue({
        common: { picture: [{}] },
      } as never);
      vi.mocked(selectCover).mockReturnValue({ format: 'image/jpeg' } as unknown as IPicture);

      const result = await extractCoverFromAudioFile(createFile());

      expect(result).toBeNull();
    });

    it('returns null when picture has no format', async () => {
      const pictureData = new Uint8Array([0xff]);
      vi.mocked(parseBlob).mockResolvedValue({
        common: { picture: [{ data: pictureData }] },
      } as never);
      vi.mocked(selectCover).mockReturnValue({ data: pictureData } as unknown as IPicture);

      const result = await extractCoverFromAudioFile(createFile());

      expect(result).toBeNull();
    });

    it('returns null when parseBlob throws', async () => {
      vi.mocked(parseBlob).mockRejectedValue(new Error('Parse failed'));

      const result = await extractCoverFromAudioFile(createFile());

      expect(result).toBeNull();
    });
  });

  describe('parseReleaseDate', () => {
    it('parses YYYY-MM-DD correctly', () => {
      const result = parseReleaseDate('2024-05-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(4); // 0-indexed May
      expect(result?.getDate()).toBe(15);
    });

    it('parses YYYY-MM correctly', () => {
      const result = parseReleaseDate('2024-05');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(4);
      expect(result?.getDate()).toBe(1);
    });

    it('parses YYYY correctly', () => {
      const result = parseReleaseDate('2024');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(1);
    });

    it('parses full UTC ISO timestamp correctly', () => {
      const result = parseReleaseDate('2024-05-15T12:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(4);
      expect(result?.getDate()).toBe(15);
    });

    it('parses non-standard date strings successfully using native fallback', () => {
      const result = parseReleaseDate('May 15, 2024');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(4);
      expect(result?.getDate()).toBe(15);
    });

    it('falls back to year number when date string is missing or invalid', () => {
      expect(parseReleaseDate(undefined, 2024)).toEqual(new Date(2024, 0, 1));
      expect(parseReleaseDate('invalid-date', 2024)).toEqual(new Date(2024, 0, 1));
    });

    it('returns null if neither date nor year are provided', () => {
      expect(parseReleaseDate()).toBeNull();
      expect(parseReleaseDate(undefined, undefined)).toBeNull();
    });
  });
});
