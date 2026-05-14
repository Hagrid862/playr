export function makeLocalPendingArtistId(): string {
  return `local:pending:${crypto.randomUUID()}`;
}

export function isLocalPendingArtistId(id: string): boolean {
  return id.startsWith('local:pending:');
}

/** Case-insensitive trimmed comparison for autofill / duplicate checks. */
export function normalizeLibraryArtistNameForMatch(name: string): string {
  return name.trim().toLowerCase();
}
