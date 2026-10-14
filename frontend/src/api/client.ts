const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Shape returned by the backend's AllExceptionsFilter
export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown; // { field: 'nickname' } for conflicts, string[] for validation
}

export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) {
    super(body.message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

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

export const googleLoginUrl = `${API_URL}/auth/google`;