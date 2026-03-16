import { AlbumType, Visibility, type Album } from "@repo/db";
import { TEST_IDS } from "./constants";

export function albumBuilder(overrides?: Partial<Album>): Album {
  const now = new Date();
  return {
    id: TEST_IDS.album,
    name: "Test Album",
    description: "Test Description",
    type: AlbumType.album,
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: null,
    visibility: Visibility.public,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
