export function makeLocalPendingGenreId(): string {
  return `local:pending:${crypto.randomUUID()}`;
}

export function isLocalPendingGenreId(id: string): boolean {
  return id.startsWith('local:pending:');
}
