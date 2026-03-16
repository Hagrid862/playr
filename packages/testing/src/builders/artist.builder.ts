import {
  rand,
  randParagraph,
  randPastDate,
  randSinger,
  randUuid,
} from "@ngneat/falso";
import { Visibility, type Artist } from "@repo/db";

export function artistBuilder(overrides?: Partial<Artist>): Artist {
  return {
    id: randUuid(),
    name: randSinger(),
    description: randParagraph(),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
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
