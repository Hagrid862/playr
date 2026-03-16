# @repo/testing

Shared testing utilities for the Playr monorepo. Provides entity builders and NestJS test helpers to reduce boilerplate across specs.

## Installation

Add as a dev dependency in your app:

```json
{
  "devDependencies": {
    "@repo/testing": "workspace:*"
  }
}
```

For NestJS helpers, you also need `@golevelup/ts-vitest` and `vitest` in your test environment.

## Exports

| Entry Point            | Contents                                 |
| ---------------------- | ---------------------------------------- |
| `@repo/testing`        | Entity builders, `TEST_IDS`              |
| `@repo/testing/nestjs` | NestJS mocks, `createMock`, `DeepMocked` |

---

## Entity Builders

Builders create test data with sensible defaults. Override any field via the `overrides` argument.

### Available Builders

- `userBuilder`, `trackBuilder`, `albumBuilder`, `artistBuilder`
- `libraryBuilder`, `libraryTrackBuilder`, `libraryAlbumBuilder`, `libraryArtistBuilder`
- `audioFileBuilder`, `sessionBuilder`, `emailAddressBuilder`, `imageBuilder`

### Usage

```typescript
import {
  userBuilder,
  trackBuilder,
  artistBuilder,
  TEST_IDS,
} from "@repo/testing";

// Default entity
const user = userBuilder();

// Override specific fields
const admin = userBuilder({ username: "admin", id: "admin-1" });

// Builders use consistent IDs for relations (e.g. track.albumId === album.id)
const track = trackBuilder();
const album = albumBuilder();
// track.albumId === TEST_IDS.album === album.id

// Reference IDs in assertions
expect(result.id).toBe(TEST_IDS.user);
```

### TEST_IDS

Shared constants for cross-referencing entities:

```typescript
import { TEST_IDS } from "@repo/testing";

TEST_IDS.user; // "user-123"
TEST_IDS.track; // "track-123"
TEST_IDS.library; // "library-123"
// ... etc
```

---

## NestJS Helpers

Import from `@repo/testing/nestjs`:

```typescript
import {
  createMock,
  type DeepMocked,
  createPrismaMock,
  createMockProviders,
  PrismaServiceMock,
} from "@repo/testing/nestjs";
```

### createPrismaMock

For repository unit specs. Returns a mocked `PrismaClient` and a provider to replace `PrismaService`.

```typescript
import { Test } from "@nestjs/testing";
import { createPrismaMock } from "@repo/testing/nestjs";
import { PrismaService } from "../services/prisma.service";
import { ArtistRepository } from "./artist.repository";

const { mockTx, prismaProvider } = createPrismaMock(PrismaService);

const module = await Test.createTestingModule({
  providers: [ArtistRepository, prismaProvider],
}).compile();

const repository = module.get(ArtistRepository);

// In your test
mockTx.artist.findFirst.mockResolvedValue(mockArtist);
const result = await repository.findOne({ id: "artist-123" });
expect(mockTx.artist.findFirst).toHaveBeenCalledWith({
  where: { id: "artist-123", deletedAt: null },
});
```

### PrismaServiceMock

Injectable class for integration tests. Use with `overrideProvider`:

```typescript
import { PrismaServiceMock } from "@repo/testing/nestjs";
import { PrismaService } from "../shared/services/prisma.service";

const moduleBuilder = Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(PrismaService)
  .useClass(PrismaServiceMock);

const app = (await moduleBuilder.compile()).createNestApplication();
const prismaMock = app.get(PrismaServiceMock);
// prismaMock.client is the mocked PrismaClient
```

### createMockProviders

Build an array of NestJS providers from `[token, mock]` tuples:

```typescript
import { createMock, createMockProviders } from "@repo/testing/nestjs";
import { UserRepository } from "../repositories/user.repository";
import { HashingService } from "../services/hashing.service";

const providers = createMockProviders([
  [UserRepository, createMock<UserRepository>()],
  [HashingService, createMock<HashingService>()],
]);

const module = await Test.createTestingModule({
  providers: [RegisterHandler, ...providers],
}).compile();
```

### createMock & DeepMocked

Re-exported from `@golevelup/ts-vitest` for convenience:

```typescript
import { createMock, type DeepMocked } from "@repo/testing/nestjs";

const mockRepo: DeepMocked<UserRepository> = createMock<UserRepository>();
mockRepo.findById.mockResolvedValue(userBuilder());
```

---

## $transaction Support

Both `createPrismaMock` and `PrismaServiceMock` handle Prisma's two `$transaction` forms:

- **Callback**: `$transaction(async (tx) => { ... })`
- **Array**: `$transaction([op1, op2, ...])`

No extra setup needed in your specs.
