const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const API_BASE = `${API_URL}/v1`;

// Shape returned by the backend's AllExceptionsFilter
export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) {
    super(body.message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({
      statusCode: res.status,
      errorCode: 'INTERNAL_ERROR',
      message: 'Unexpected error',
    }))) as ApiErrorBody;
    throw new ApiError(res.status, body);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const googleLoginUrl = `${API_BASE}/auth/google`;