import type { CreateLibraryAlbumRequest, ZodAlbum, ZodArtist } from '@repo/contracts';
import { AlbumType, Visibility } from '@repo/db';

export const mockArtist: ZodArtist = {
  id: 'artist-1',
  name: 'Mock Artist',
  description: 'Mock Description',
  isCommunity: false,
  verified: false,
  bannerId: null,
  avatarId: null,
  visibility: 'public',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as ZodArtist;

export const mockAlbum: ZodAlbum = {
  id: 'album-1',
  name: 'Mock Album',
  description: 'Mock Description',
  type: AlbumType.album,
  releaseDate: new Date('2020-01-01'),
  totalTracks: 10,
  totalDuration: 3000,
  coverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  visibility: Visibility.public,
  cover: null,
};

export function createMockAlbum(overrides: Partial<ZodAlbum> = {}): ZodAlbum {
  return {
    ...mockAlbum,
    ...overrides,
  };
}

export function createMockArtist(overrides: Partial<ZodArtist> = {}): ZodArtist {
  return {
    ...mockArtist,
    ...overrides,
  };
}

export function createMockCreateAlbumRequest(overrides: Partial<CreateLibraryAlbumRequest> = {}): CreateLibraryAlbumRequest {
  return {
    name: '',
    description: '',
    type: AlbumType.album,
    artistId: 'artist-1',
    releaseDate: null,
    ...overrides,
  };
}
