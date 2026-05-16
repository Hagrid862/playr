import {
  rand,
  randBetweenDate,
  randNumber,
  randParagraph,
  randPastDate,
  randSong,
  randUuid,
} from "@ngneat/falso";
import { AlbumSystemKind, AlbumType, Visibility, type Album } from "@repo/db";

export function albumBuilder(overrides?: Partial<Album>): Album {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    name: randSong(),
    description: randParagraph(),
    type: rand([
      AlbumType.album,
      AlbumType.single,
      AlbumType.ep,
      AlbumType.compilation,
    ]),
    totalTracks: randNumber({ min: 10, max: 20 }),
    totalDuration: randNumber({ min: 3000, max: 6000 }),
    libraryId: randUuid(),
    systemKind: rand([AlbumSystemKind.none, AlbumSystemKind.unknown_bucket]),
    releaseDate: randBetweenDate({
      from: new Date("2020-01-01"),
      to: new Date(),
    }),
    coverId: null,
    visibility: rand([
      Visibility.public,
      Visibility.private,
      Visibility.community,
    ]),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    deletedAt: null,
    ...overrides,
  };
}
