// Set default environment variables for integration tests
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://playr:playr@localhost:5432/playr?schema=public';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost';
process.env.S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin';
process.env.S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin';
process.env.S3_PUBLIC_BUCKET = process.env.S3_PUBLIC_BUCKET || 'public-bucket';
process.env.S3_PRIVATE_BUCKET = process.env.S3_PRIVATE_BUCKET || 'private-bucket';
process.env.MAIL_HOST = process.env.MAIL_HOST || 'localhost';
