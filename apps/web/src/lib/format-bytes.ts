const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Human-readable byte size (base 1024), e.g. "2.1 GB".
 */
export function formatBytes(bytes: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes === 0) {
    return '0 B';
  }

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const unit = UNITS[exponent];

  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: exponent === 0 ? 0 : maximumFractionDigits,
  })} ${unit}`;
}
