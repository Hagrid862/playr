export async function apiClient<T>(
  endpoint: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const { body, ...customConfig } = options;
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

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const response = await fetch(`${apiUrl}/api/${endpoint}`, config);

  if (response.ok) {
    // Some endpoints might return 204 No Content
    if (response.status === 204) {
      return {} as T;
    }
    const data = await response.json();
    return data;
  } else {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.message || response.statusText || 'Unknown error';
    return Promise.reject(new Error(errorMessage));
  }
}
