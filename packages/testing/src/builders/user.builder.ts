import {
  rand,
  randBetweenDate,
  randFirstName,
  randLastName,
  randPastDate,
  randUserName,
  randUuid,
} from "@ngneat/falso";
import type { User } from "@repo/db";
import { Gender } from "@repo/db";

export function userBuilder(overrides?: Partial<User>): User {
  return {
    id: randUuid(),
    username: randUserName({ withAccents: false }),
    password: "hashed-password",
    firstName: randFirstName(),
    lastName: randLastName(),
    birthDate: randBetweenDate({
      from: new Date("1950-01-01"),
      to: new Date("2000-01-01"),
    }).toISOString(),
    gender: rand([Gender.male, Gender.female, Gender.other]),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
    avatarId: null,
    description: null,
    deletedAt: null,
    ...overrides,
  };
}
