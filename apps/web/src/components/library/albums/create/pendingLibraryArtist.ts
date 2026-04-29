export function makeLocalPendingArtistId(): string {
  return `local:pending:${crypto.randomUUID()}`;
}

export function isLocalPendingArtistId(id: string): boolean {
  return id.startsWith('local:pending:');
}
