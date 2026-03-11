import { Gender, type User, type ArtistProfile } from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildUser(overrides: Partial<User> = {}): User {
  const base: User = {
    id: "user-id-123",
    username: "testuser",
    password: "hashed-password",
    firstName: "John",
    lastName: "Doe",
    birthDate: "2000-01-01",
    gender: Gender.male,
    createdAt: now,
    updatedAt: now,
    avatarId: null,
    description: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildArtistProfile(
  overrides: Partial<ArtistProfile> = {},
): ArtistProfile {
  const base: ArtistProfile = {
    id: "artist-profile-123",
    userId: "user-id-123",
    artistId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
