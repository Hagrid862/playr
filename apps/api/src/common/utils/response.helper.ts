import { Request } from 'express';

export interface StandardizedError {
  statusCode: number;
  message: string | object;
}

export interface StandardizedResponse<T> {
  success: boolean;
  data: T | null;
  error: StandardizedError | null;
  meta: {
    timestamp: string;
    requestId: string;
    path: string;
    duration?: string;
    [key: string]: any;
  };
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function createStandardizedResponse<T>({
  data = null,
  error = null,
  request,
  extraMeta = {},
  success = true,
}: {
  data?: T | null;
  error?: StandardizedError | null;
  request: Request;
  extraMeta?: Record<string, any>;
  success?: boolean;
}): StandardizedResponse<T> {
  const headerId = request.headers['x-request-id'];
  const normalizedHeaderId = Array.isArray(headerId) ? headerId[0] : headerId;
  const requestId = request.id || normalizedHeaderId || generateRequestId();
  const timestamp = new Date().toISOString();

  let duration: string | undefined;
  if (request.startTime) {
    const durationMs = Date.now() - request.startTime;
    duration = `${durationMs}ms`;
  }

  return {
    success,
    data,
    error,
    meta: {
      timestamp,
      requestId,
      path: request.url,
      ...(duration && { duration }),
      ...extraMeta,
    },
  };
}
