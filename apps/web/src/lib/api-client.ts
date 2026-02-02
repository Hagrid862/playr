import { ZodType } from 'zod';
import { ApiError } from './api-error';

type RequestConfig<T> = Omit<RequestInit, 'body'> & {
  body?: unknown;
  zodSchema?: ZodType<T>;
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestConfig<T> = {}): Promise<T> {
    const { body, zodSchema, ...customConfig } = options;
    const headers = { 'Content-Type': 'application/json' };

    const config: RequestInit = {
      method: body ? 'POST' : 'GET',
      ...customConfig,
      headers: {
        ...headers,
        ...customConfig.headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}/api/${endpoint}`, config);

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
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, response.statusText, errorData);
    }
  }
}

export const api = new ApiClient(import.meta.env.VITE_API_URL || 'http://localhost:8000');

export const apiClient = <T>(endpoint: string, options?: RequestConfig<T>) => {
  return api.request<T>(endpoint, options);
};
