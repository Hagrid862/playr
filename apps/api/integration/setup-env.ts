// Set default environment variables for integration tests
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://playr:playr@localhost:5435/playr?schema=public';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
process.env.MAIL_HOST = process.env.MAIL_HOST || 'localhost';
