import { z } from 'zod';

const envSchemaBase = z.object({
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // S3
  S3_ENDPOINT: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_USE_SSL: z.coerce.boolean().default(false),
  S3_PUBLIC_BUCKET: z.string().min(1),
  S3_PRIVATE_BUCKET: z.string().min(1),
  S3_PUBLIC_URL: z.url().optional(),

  // Mail — use RESEND_API_KEY (production) or MAIL_HOST SMTP (local Mailhog)
  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_HOST: z.string().min(1).optional(),
  MAIL_PORT: z.coerce.number().default(1025),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('noreply@playr.com'),

  // Throttling
  THROTTLE_ENABLED: z.coerce.boolean().default(true),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  /** Max age of `PlaybackState.updatedAt` before reads treat state as absent (ms). Default 30 days. */
  PLAYBACK_STATE_STALE_AFTER_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1000 * 60 * 60 * 24 * 30),

  /** Default per-user library audio storage cap (bytes). Overridden by User.storageQuotaBytes when set. */
  LIBRARY_STORAGE_QUOTA_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024 * 1024),
});

export const envSchema = envSchemaBase.superRefine((data, ctx) => {
  if (!data.RESEND_API_KEY && !data.MAIL_HOST) {
    ctx.addIssue({
      code: 'custom',
      message: 'Either RESEND_API_KEY or MAIL_HOST must be set',
      path: ['RESEND_API_KEY'],
    });
  }
});

export type Env = z.infer<typeof envSchemaBase>;

export const validateEnv = (config: Record<string, unknown>) => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }

  return result.data;
};
