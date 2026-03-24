export function isProductionNodeEnv(): boolean {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' || env === 'prod';
}

/** Same rules as HTTP CORS in main.ts: dev reflects request origin; prod uses CORS_ALLOWED_ORIGINS. */
export function getCorsOrigin(): true | string[] {
  if (!isProductionNodeEnv()) {
    return true;
  }
  return process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
}
