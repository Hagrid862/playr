# @repo/testing

Shared testing utilities for the Playr monorepo. Provides entity builders, NestJS test helpers, and web (React) test utilities to reduce boilerplate across specs.

## Installation

Add as a dev dependency in your app:

```json
{
  "devDependencies": {
    "@repo/testing": "workspace:*"
  }
}
```

- **NestJS helpers**: Also need `@golevelup/ts-vitest` and `vitest`.
- **Web helpers**: Also need `@testing-library/react`, `@tanstack/react-query`, `react`, and `react-dom` (plus `@tanstack/react-router` for router mocks).

## Exports

| Entry Point            | Contents                                           |
| ---------------------- | -------------------------------------------------- |
| `@repo/testing`        | Entity builders                                    |
| `@repo/testing/nestjs` | NestJS mocks, `createMock`, `DeepMocked`           |
| `@repo/testing/web`    | React render, store mocks, router mock, form mocks |

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
  albumBuilder,
  artistBuilder,
} from "@repo/testing";

// Default entity (IDs are random via randUuid)
const user = userBuilder();

// Override specific fields
const admin = userBuilder({ username: "admin", id: "admin-1" });

// Builders produce random IDs by default. For consistent relations, pass IDs explicitly:
const album = albumBuilder();
const track = trackBuilder({ albumId: album.id });
expect(track.albumId).toBe(album.id);

// Reference IDs in assertions (use overrides for predictable values)
expect(admin.id).toBe("admin-1");
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

## Web Helpers

Import from `@repo/testing/web`:

```typescript
import {
  customRender,
  createRouterMock,
  createPlayerStoreMock,
  createAuthStoreMock,
  createLibraryStoreMock,
  createFormMocks,
} from "@repo/testing/web";
```

### customRender

Renders a component with `QueryClientProvider` and `RouterProvider` for tests that need React Query and/or TanStack Router (`useNavigate`, `useParams`, `Link`, etc.):

```tsx
import { customRender } from "@repo/testing/web";

customRender(<MyComponent />);

// With custom QueryClient
customRender(<MyComponent />, { queryClient: myQueryClient });

// With initial URL for the in-memory router
customRender(<MyComponent />, { initialLocation: "/albums/123" });

// With router context (e.g. when your app expects auth in router context)
customRender(<MyComponent />, { routerContext: { auth: mockAuth } });
```

### createRouterMock

Mocks `@tanstack/react-router` for tests:

```typescript
import { createRouterMock } from "@repo/testing/web";
import { vi } from "vitest";

vi.mock("@tanstack/react-router", () => createRouterMock(vi));

// With custom navigate spy
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => createRouterMock(vi, { mockNavigate }));
```

### Store Mocks

Create default store state for tests. Override any field via the `overrides` argument.

**createPlayerStoreMock** — player state (currentTrack, isPlaying, queue, etc.):

```typescript
vi.mock("@/stores/player.store", () => ({ usePlayerStore: vi.fn() }));
vi.mocked(usePlayerStore).mockReturnValue(
  createPlayerStoreMock({ isPlaying: true }),
);
```

**createAuthStoreMock** — auth state (user, accessToken, isAuthenticated, etc.):

```typescript
vi.mock("@/stores/auth.store", () => ({ useAuthStore: vi.fn() }));
vi.mocked(useAuthStore).mockReturnValue(
  createAuthStoreMock({ isAuthenticated: true }),
);
```

**createLibraryStoreMock** — library state (libraryId, privateArtists, etc.):

```typescript
vi.mock("@/stores/library.store", () => ({ useLibraryStore: vi.fn() }));
vi.mocked(useLibraryStore).mockReturnValue(
  createLibraryStoreMock({ libraryId: "lib-123" }),
);
```

### createFormMocks

Simplified form components (`TextField`, `TextAreaField`, `SelectField`) for isolating component behavior:

```typescript
vi.mock("@/components/form", () => ({
  ...createFormMocks(),
}));
```

---

## $transaction Support

Both `createPrismaMock` and `PrismaServiceMock` handle Prisma's two `$transaction` forms:

- **Callback**: `$transaction(async (tx) => { ... })`
- **Array**: `$transaction([op1, op2, ...])`

No extra setup needed in your specs.
