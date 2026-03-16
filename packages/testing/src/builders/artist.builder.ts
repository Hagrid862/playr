import {
  rand,
  randBetweenDate,
  randParagraph,
  randPastDate,
  randSinger,
  randUuid,
} from "@ngneat/falso";
import { Visibility, type Artist } from "@repo/db";

export function artistBuilder(overrides?: Partial<Artist>): Artist {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    name: randSinger(),
    description: randParagraph(),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    deletedAt: null,
    bannerId: null,
    avatarId: null,
    visibility: rand([
      Visibility.public,
      Visibility.private,
      Visibility.community,
    ]),
    isCommunity: false,
    verified: false,
    ...overrides,
  };
}
