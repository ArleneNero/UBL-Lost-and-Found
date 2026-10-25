import { ApiErrorResponse } from '@/types/api';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let activeAuthToken: string | null = null;

export function setAuthToken(token: string | null): void {
  activeAuthToken = token;
  if (token) {
    sessionStorage.setItem('lf_auth_token', token);
  } else {
    sessionStorage.removeItem('lf_auth_token');
  }
}

export function getAuthToken(): string | null {
  if (activeAuthToken) return activeAuthToken;
  try {
    return sessionStorage.getItem('lf_auth_token');
  } catch {
    return null;
  }
}

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorCode = 'API_ERROR';
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    let requestId: string | undefined;

    try {
      const errJson = (await response.json()) as ApiErrorResponse;
      if (errJson.error) {
        errorCode = errJson.error.code || errorCode;
        errorMessage = errJson.error.message || errorMessage;
        requestId = errJson.error.request_id;
      }
    } catch {
      // Body is not JSON, use default HTTP message
    }

    throw new ApiError(errorCode, errorMessage, response.status, requestId);
  }

  return (await response.json()) as T;
}
