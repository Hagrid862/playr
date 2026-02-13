import { useAuthStore } from '@/stores/auth.store';
import { ZodType } from 'zod';
import { ApiError } from './api-error';

type RequestConfig<T> = Omit<RequestInit, 'body'> & {
  body?: unknown;
  zodSchema?: ZodType<T>;
  _retry?: boolean;
};

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private failedQueue: {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private processQueue(error: unknown, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token ?? '');
      }
    });

    this.failedQueue = [];
  }

  async request<T>(endpoint: string, options: RequestConfig<T> = {}): Promise<T> {
    const { body, zodSchema, _retry, ...customConfig } = options;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      ...customConfig,
      headers: {
        ...headers,
        ...customConfig.headers,
      },
    };

    if (body) {
      if (body instanceof FormData) {
        config.body = body;
        delete (config.headers as Record<string, string>)['Content-Type'];
      } else {
        config.body = JSON.stringify(body);
      }
    }

    const response = await fetch(`${this.baseUrl}/${endpoint}`, config);

    if (response.ok) {
      if (response.status === 204) {
        return {} as T;
      }
      const data = await response.json();
      if (zodSchema) {
        return zodSchema.parse(data);
      }
      return data;
    } else {
      if (response.status === 401 && !_retry) {
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          })
            .then(() => {
              return this.request<T>(endpoint, {
                ...options,
                _retry: true,
              });
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        this.isRefreshing = true;

        try {
          // Attempt refresh
          const refreshResponse = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newAccessToken = refreshData.data?.accessToken;

            if (!newAccessToken) {
              throw new Error('Refresh token response missing access token');
            }

            useAuthStore.getState().updateAccessToken(newAccessToken);
            this.processQueue(null, newAccessToken);

            // Retry original request
            return this.request<T>(endpoint, {
              ...options,
              _retry: true,
            });
          } else {
            this.processQueue(new Error('Refresh failed'));
            useAuthStore.getState().logout();
          }
        } catch (error) {
          this.processQueue(error);
          useAuthStore.getState().logout();
          throw error;
        } finally {
          this.isRefreshing = false;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, response.statusText, errorData);
    }
  }
}

export const api = new ApiClient(import.meta.env.VITE_API_URL || 'http://localhost:8000');

export const apiClient = <T>(endpoint: string, options?: RequestConfig<T>) => {
  return api.request<T>(endpoint, options);
};
