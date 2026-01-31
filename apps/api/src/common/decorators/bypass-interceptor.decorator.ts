import { SetMetadata } from '@nestjs/common';

export const BYPASS_RESPONSE_INTERCEPTOR_KEY = 'bypass_response_interceptor';

/**
 * Decorator to bypass the global response interceptor for a specific route.
 * Use this when you need control over the raw response (e.g. file downloads, metrics).
 */
export const BypassResponseInterceptor = () => SetMetadata(BYPASS_RESPONSE_INTERCEPTOR_KEY, true);
