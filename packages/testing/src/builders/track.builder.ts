import {
  rand,
  randBetweenDate,
  randBoolean,
  randNumber,
  randPastDate,
  randSong,
  randUuid,
} from "@ngneat/falso";
import type { Track } from "@repo/db";
import { Visibility } from "@repo/db";

export function trackBuilder(overrides?: Partial<Track>): Track {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    title: randSong(),
    trackNumber: randNumber({ min: 1, max: 20 }),
    diskNumber: randNumber({ min: 1, max: 4 }),
    duration: randNumber({ min: 180, max: 360 }),
    listenedCount: randNumber({ min: 0, max: 100 }),
    explicit: randBoolean(),
    lyrics: null,
    visibility: rand([
      Visibility.public,
      Visibility.private,
      Visibility.community,
    ]),
    albumId: randUuid(),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    deletedAt: null,
    ...overrides,
  };
}
