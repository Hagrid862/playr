# @repo/testing

Shared testing utilities for the Playr monorepo: entity builders, HTTP/API request builders, NestJS helpers, Multer mocks, and web (React) test utilities to reduce boilerplate across specs.

## Installation

Add as a dev dependency in your app:

```json
{
  "devDependencies": {
    "@repo/testing": "workspace:*"
  }
}
```

- **Nest helpers**: `@nestjs/common` (peer, optional).
- **Web helpers**: `@testing-library/react`, `@tanstack/react-query`, `react`, and `react-dom` (peers, optional); `@tanstack/react-router` for router mocks and `customRenderWithRouter`.
- **Multer mock** (`@repo/testing/mocks`): types come from `@types/multer` if your TS project does not already include them.

## Exports

The root entry `@repo/testing` re-exports everything below. Prefer a subpath when you only need one area (clearer imports and friendlier bundling).

| Entry Point              | Contents                                                        |
| ------------------------ | --------------------------------------------------------------- |
| `@repo/testing`          | Barrel: builders, mocks, nestjs, web                            |
| `@repo/testing/builders` | Entity and domain builders                                      |
| `@repo/testing/requests` | Contract-shaped request builders for API/command tests          |
| `@repo/testing/mocks`    | `createMockFile` (Express.Multer.File) for upload handler specs |
| `@repo/testing/nestjs`   | Prisma mocks, `createMock`, `createMockProviders`, `DeepMocked` |
| `@repo/testing/web`      | React render helpers, store/router/form mocks                   |

---

## Entity builders

Import from `@repo/testing` or `@repo/testing/builders`.

Builders create test data with sensible defaults. Override any field via the `overrides` argument.

### Available builders

- **Core**: `userBuilder`, `trackBuilder`, `albumBuilder`, `artistBuilder`
- **Library**: `libraryBuilder`, `libraryTrackBuilder`, `libraryAlbumBuilder`, `libraryArtistBuilder`
- **Media / auth**: `audioFileBuilder`, `sessionBuilder`, `emailAddressBuilder`, `imageBuilder`, `refreshTokenBuilder`
- **Access / composite**: `albumAccessBuilder`, `artistAccessBuilder`, `trackAccessBuilder`, `trackWithAccessBuilder`

### Usage

```typescript
import {
  userBuilder,
  trackBuilder,
  albumBuilder,
  artistBuilder,
} from "@repo/testing/builders";

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

## Request builders

Import from `@repo/testing/requests`. These return objects aligned with `@repo/contracts` types for handler and integration tests.

| Export                                  | Purpose                     |
| --------------------------------------- | --------------------------- |
| `loginRequestBuilder`                   | Login body                  |
| `registerRequestBuilder`                | Registration body           |
| `createLibraryAlbumRequestBuilder`      | Create library album        |
| `createLibraryTrackRequestBuilder`      | Create library track        |
| `createLibraryArtistRequestBuilder`     | Create library artist       |
| `bulkCreateLibraryTracksRequestBuilder` | Bulk create tracks request  |
| `bulkCreateLibraryTrackItemBuilder`     | Single item for bulk create |
| `updateLibraryAlbumRequestBuilder`      | Update library album        |
| `updateLibraryTrackRequestBuilder`      | Update library track        |
| `updateLibraryArtistRequestBuilder`     | Update library artist       |
| `deleteLibraryAlbumRequestBuilder`      | Delete library album        |
| `deleteLibraryArtistRequestBuilder`     | Delete library artist       |
| `getLibraryAlbumsRequestBuilder`        | List/filter library albums  |
| `getLibraryTracksRequestBuilder`        | List/filter library tracks  |
| `getLibraryArtistsRequestBuilder`       | List/filter library artists |
| `bulkUploadTrackAudioRequestBuilder`    | Bulk upload track audio     |

```typescript
import { loginRequestBuilder } from "@repo/testing/requests";

const body = loginRequestBuilder({ email: "user@example.com" });
```

---

## Multer mock

Import from `@repo/testing/mocks`.

```typescript
import { createMockFile } from "@repo/testing/mocks";

const file = createMockFile({
  originalname: "song.mp3",
  mimetype: "audio/mpeg",
});
```

---

## NestJS helpers

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

## Web helpers

Import from `@repo/testing/web` (or `@repo/testing` for the barrel):

```typescript
import {
  customRender,
  customRenderHook,
  customRenderWithRouter,
  customRenderHookWithRouter,
  createRouterMock,
  createPlayerStoreMock,
  createAuthStoreMock,
  createLibraryStoreMock,
  createFormMocks,
} from "@repo/testing/web";
```

### customRender & hooks

`customRender` wraps components with `QueryClientProvider` (React Query). `customRenderHook` does the same for hooks.

```tsx
import { customRender, customRenderHook } from "@repo/testing/web";

customRender(<MyComponent />);

// With custom QueryClient
customRender(<MyComponent />, { queryClient: myQueryClient });

customRenderHook(() => useMyHook(), { queryClient: myQueryClient });
```

For TanStack Router (`useNavigate`, `useParams`, `<Link>`, etc.), use `customRenderWithRouter` or `customRenderHookWithRouter`. Route content can mount asynchronously; prefer `findBy*` / `waitFor` when needed. If the same file uses `vi.mock("@tanstack/react-router", ...)`, use a partial mock (e.g. `importOriginal`) so real `RouterProvider` / `createRouter` remain available to these helpers.

```tsx
import {
  customRenderWithRouter,
  customRenderHookWithRouter,
} from "@repo/testing/web";

customRenderWithRouter(<MyPage />, { initialLocation: "/albums/123" });
customRenderWithRouter(<MyPage />, { routerContext: { auth: mockAuth } });

customRenderHookWithRouter(() => useParams(), {
  initialLocation: "/albums/123",
});
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

### Store mocks

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

## `$transaction` support

Both `createPrismaMock` and `PrismaServiceMock` handle Prisma's two `$transaction` forms:

- **Callback**: `$transaction(async (tx) => { ... })`
- **Array**: `$transaction([op1, op2, ...])`

No extra setup needed in your specs.
