import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractCoverFromAudioFile, extractMetadataFromAudioFile } from './audio-metadata';

vi.mock('music-metadata', () => ({
  parseBlob: vi.fn(),
  selectCover: vi.fn(),
}));

import type { IPicture } from 'music-metadata';
import { parseBlob, selectCover } from 'music-metadata';

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
});
