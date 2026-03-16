/**
 * Creates a default library store state for tests. Override any field via overrides.
 * Use with vi.mocked(useLibraryStore).mockReturnValue(createLibraryStoreMock({ libraryId: 'lib-123' }))
 *
 * @example
 * ```ts
 * vi.mock('@/stores/library.store', () => ({ useLibraryStore: vi.fn() }));
 * vi.mocked(useLibraryStore).mockReturnValue(createLibraryStoreMock({ libraryId: 'lib-123' }));
 * ```
 */
export function createLibraryStoreMock(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const noop = () => {};
  return {
    libraryId: null,
    privateAccountId: null,
    privateArtists: [],
    privateAlbums: [],
    setLibraryId: noop,
    setPrivateAccountId: noop,
    setPrivateArtists: noop,
    setPrivateAlbums: noop,
    updatePrivateArtist: noop,
    updatePrivateAlbum: noop,
    removePrivateArtist: noop,
    removePrivateAlbum: noop,
    clearLibrary: noop,
    ...overrides,
  };
}