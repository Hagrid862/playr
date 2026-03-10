import { Gender } from '@repo/db';
import type { User, AlbumType, Visibility } from '@repo/db';
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
  return buildWithOverrides(
    {
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
    } satisfies User,
    overrides,
  );
}

/** Builds a ZodUser for web/contract tests */
export function buildZodUser(overrides: Partial<ZodUser> = {}): ZodUser {
  return buildWithOverrides(
    {
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
    } as ZodUser,
    overrides,
  );
}

/** Builds a ZodArtist for tests */
export function buildZodArtist(overrides: Partial<ZodArtist> = {}): ZodArtist {
  return buildWithOverrides(
    {
      id: 'artist-1',
      name: 'Mock Artist',
      description: null,
      isCommunity: false,
      verified: false,
      bannerId: null,
      avatarId: null,
      visibility: 'public' as Visibility,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as ZodArtist,
    overrides,
  );
}

/** Builds a ZodAlbum for tests */
export function buildZodAlbum(overrides: Partial<ZodAlbum> = {}): ZodAlbum {
  return buildWithOverrides(
    {
      id: 'album-1',
      name: 'Mock Album',
      description: null,
      type: 'album' as AlbumType,
      releaseDate: now,
      totalTracks: 10,
      totalDuration: 3000,
      coverId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      visibility: 'public' as Visibility,
      cover: null,
    } as ZodAlbum,
    overrides,
  );
}

/** Builds a RegisterRequest DTO for auth tests */
export function buildRegisterRequest(
  overrides: Partial<RegisterRequest> = {},
): RegisterRequest {
  return buildWithOverrides(
    {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '2000-01-01',
      gender: 'male',
    } as RegisterRequest,
    overrides,
  );
}

/** Builds a CreateLibraryAlbumRequest for album tests */
export function buildCreateLibraryAlbumRequest(
  overrides: Partial<CreateLibraryAlbumRequest> = {},
): CreateLibraryAlbumRequest {
  return buildWithOverrides(
    {
      name: 'Test Album',
      description: '',
      type: 'album' as AlbumType,
      artistId: 'artist-1',
      releaseDate: null,
    } as CreateLibraryAlbumRequest,
    overrides,
  );
}
