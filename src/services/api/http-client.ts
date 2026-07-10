import { AppCopy } from '@/constants/copy';

type ApiEnvelope<T> = { data: T };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class HttpClient {
  private accessToken?: string;

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 12_000
  ) {}

  setAccessToken(token?: string) {
    this.accessToken = token;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
          ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
          ...init.headers,
        },
      });

      const payload = await readPayload(response);
      if (!response.ok) {
        const error = asErrorPayload(payload);
        throw new ApiError(error.message ?? `HTTP ${response.status}`, response.status, error.code);
      }

      return unwrapData(payload) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(AppCopy.errors.requestTimeout, 408, 'REQUEST_TIMEOUT');
      }
      throw new ApiError(error instanceof Error ? error.message : AppCopy.errors.network);
    } finally {
      clearTimeout(timer);
    }
  }
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(AppCopy.errors.invalidResponse, response.status, 'INVALID_RESPONSE');
  }
}

function unwrapData(value: unknown) {
  if (isRecord(value) && 'data' in value) return (value as ApiEnvelope<unknown>).data;
  return value;
}

function asErrorPayload(value: unknown): { message?: string; code?: string } {
  if (!isRecord(value)) return {};
  if (isRecord(value.error)) return value.error;
  return value;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
