import { apiBaseUrl } from '../../../config/securepay';

export type ErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'invalid-response';
export class ApiError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    message: string,
    public readonly status: number | null = null,
    public readonly code: string | null = null,
  ) { super(message); this.name = 'ApiError'; }
}
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  auth?: 'none' | 'optional' | 'required';
  signal?: AbortSignal;
}
export interface HttpClient { request<T>(path: string, options?: RequestOptions): Promise<T> }
export type AccessTokenProvider = () => string | null;

/** No retries, token persistence, logging, or fixture imports. Idempotency belongs to each endpoint's body. */
export function createHttpClient(baseUrl: string, getAccessToken: AccessTokenProvider, fetcher: typeof fetch = fetch, timeoutMs = 15000): HttpClient {
  const validatedBaseUrl = apiBaseUrl(baseUrl);
  return {
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
      if (!path.startsWith('/api/') || path.includes('..') || path.includes('\\')) throw new Error('Invalid API path');
      const headers = new Headers({ Accept: 'application/json' });
      const token = options.auth === 'none' ? null : getAccessToken();
      if (options.auth === 'required' && !token) throw new ApiError('http', 'Authentication required', 401, 'AUTHENTICATION_REQUIRED');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (options.body !== undefined) headers.set('Content-Type', 'application/json');
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) abort();
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      let status: number | null = null;
      try {
        const response = await fetcher(`${validatedBaseUrl}${path}`, {
          method: options.method ?? 'GET', headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
        });
        status = response.status;
        const text = await response.text();
        let data: unknown;
        try { data = text ? JSON.parse(text, (_key, value: unknown) => {
          if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) {
            throw new Error('Unsafe JSON integer');
          }
          return value;
        }) : undefined; } catch {
          if (response.ok) throw new ApiError('invalid-response', 'Invalid JSON response', status);
        }
        if (!response.ok) {
          const error = data && typeof data === 'object' ? data as Record<string, unknown> : {};
          throw new ApiError('http', typeof error.message === 'string' ? error.message : 'SecurePay request failed', status, typeof error.code === 'string' ? error.code : null);
        }
        if (!text && status !== 204) throw new ApiError('invalid-response', 'Empty API response', status);
        return data as T;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (timedOut) throw new ApiError('timeout', 'SecurePay request timed out', status);
        if (controller.signal.aborted) throw new ApiError('aborted', 'Request cancelled', status);
        throw new ApiError('network', 'SecurePay is unavailable', status);
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
      }
    },
  };
}
export const segment = (value: string): string => {
  if (!value || value === '.' || value === '..') throw new Error('Missing or invalid resource identifier');
  return encodeURIComponent(value);
};

export type RemoteState<T> =
  | { status: 'idle' | 'loading' | 'empty' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: ApiError };
