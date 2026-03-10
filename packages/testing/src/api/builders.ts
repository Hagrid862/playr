import { Gender } from '@repo/db';
import type {
  User,
  Library,
  LibraryTrack,
  LibraryAlbum,
  LibraryArtist,
  Album,
  Artist,
  Track,
} from '@repo/db';
import { Visibility, AlbumType } from '@repo/db';
import type {
  ZodUser,
  ZodArtist,
  ZodAlbum,
  RegisterRequest,
  CreateLibraryAlbumRequest,
} from '@repo/contracts';
import { buildWithOverrides } from '../shared/builders';

const now = new Date();

/** Builds a User (Prisma model) for API tests */
export function buildUser(overrides: Partial<User> = {}): User {
  const base: User = {
    id: 'user-id-123',
    username: 'testuser',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: Gender.male,
    createdAt: now,
    updatedAt: now,
    avatarId: null,
    description: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a ZodUser for web/contract tests */
export function buildZodUser(overrides: Partial<ZodUser> = {}): ZodUser {
  const base: ZodUser = {
    id: 'user-id-123',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: 'male',
    description: null,
    avatarId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a ZodArtist for tests */
export function buildZodArtist(overrides: Partial<ZodArtist> = {}): ZodArtist {
  const base: ZodArtist = {
    id: 'artist-1',
    name: 'Mock Artist',
    description: null,
    isCommunity: false,
    verified: false,
    bannerId: null,
    avatarId: null,
    visibility: Visibility.public,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a ZodAlbum for tests */
export function buildZodAlbum(overrides: Partial<ZodAlbum> = {}): ZodAlbum {
  const base: ZodAlbum = {
    id: 'album-1',
    name: 'Mock Album',
    description: null,
    type: AlbumType.album,
    releaseDate: now,
    totalTracks: 10,
    totalDuration: 3000,
    coverId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    visibility: Visibility.public,
    cover: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a RegisterRequest DTO for auth tests */
export function buildRegisterRequest(
  overrides: Partial<RegisterRequest> = {},
): RegisterRequest {
  const base: RegisterRequest = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: 'male',
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a CreateLibraryAlbumRequest for album tests */
export function buildCreateLibraryAlbumRequest(
  overrides: Partial<CreateLibraryAlbumRequest> = {},
): CreateLibraryAlbumRequest {
  const base: CreateLibraryAlbumRequest = {
    name: 'Test Album',
    description: '',
    type: AlbumType.album,
    artistId: 'artist-1',
    releaseDate: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a Library for tests */
export function buildLibrary(overrides: Partial<Library> = {}): Library {
  const base: Library = {
    id: 'library-123',
    userId: 'user-123',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a LibraryTrack for tests */
export function buildLibraryTrack(overrides: Partial<LibraryTrack> = {}): LibraryTrack {
  const base: LibraryTrack = {
    id: 'lib-track-123',
    libraryId: 'library-123',
    trackId: 'track-123',
    listenedCount: 0,
    listenCountResetAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a LibraryAlbum for tests */
export function buildLibraryAlbum(overrides: Partial<LibraryAlbum> = {}): LibraryAlbum {
  const base: LibraryAlbum = {
    id: 'lib-album-123',
    libraryId: 'library-123',
    albumId: 'album-123',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a LibraryArtist for tests */
export function buildLibraryArtist(overrides: Partial<LibraryArtist> = {}): LibraryArtist {
  const base: LibraryArtist = {
    id: 'lib-artist-123',
    libraryId: 'library-123',
    artistId: 'artist-123',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds an Album (Prisma model) for tests */
export function buildAlbum(overrides: Partial<Album> = {}): Album {
  const base: Album = {
    id: 'album-123',
    name: 'Test Album',
    description: null,
    type: AlbumType.album,
    releaseDate: now,
    totalTracks: 0,
    totalDuration: 0,
    coverId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    visibility: Visibility.public,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds an Artist (Prisma model) for tests */
export function buildArtist(overrides: Partial<Artist> = {}): Artist {
  const base: Artist = {
    id: 'artist-123',
    name: 'Test Artist',
    description: null,
    isCommunity: false,
    verified: false,
    bannerId: null,
    avatarId: null,
    visibility: Visibility.public,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

/** Builds a Track (Prisma model) for tests */
export function buildTrack(overrides: Partial<Track> = {}): Track {
  const base: Track = {
    id: 'track-123',
    title: 'Test Track',
    albumId: 'album-123',
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    listenedCount: 0,
    explicit: false,
    visibility: Visibility.public,
    lyrics: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
