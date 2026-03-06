import type { ZodAlbumInfer, ZodArtist } from '@repo/contracts';
import type { BulkTrackItem } from '@/lib/types/library';

export function createMockBulkTrack(overrides: Partial<BulkTrackItem> = {}): BulkTrackItem {
  return {
    id: 'track-1',
    file: new File(['audio'], 'track1.mp3', { type: 'audio/mpeg' }),
    title: 'Track 1',
    trackNumber: 1,
    diskNumber: 1,
    explicit: false,
    ...overrides,
  };
}

export const mockArtist: ZodArtist = {
  id: 'a1',
  name: 'Artist',
  description: null,
  isCommunity: false,
  verified: false,
  bannerId: null,
  avatarId: null,
  visibility: 'public',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as ZodArtist;

export const mockAlbum: ZodAlbumInfer = {
  id: 'album-123',
  name: 'Test Album',
  description: '',
  type: 'album',
  visibility: 'private',
  totalTracks: 0,
  totalDuration: 0,
  releaseDate: null,
  coverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  artists: [mockArtist],
  tracks: [],
  genres: [],
  cover: null,
};

export const createTrackMockAlbum: ZodAlbumInfer = {
  ...mockAlbum,
  description: 'A test album',
  totalTracks: 10,
  totalDuration: 300,
  releaseDate: new Date(),
  artists: [
    {
      ...mockArtist,
      id: 'artist-123',
      name: 'Test Artist',
      description: 'Test Description',
    } as ZodArtist,
  ],
};
