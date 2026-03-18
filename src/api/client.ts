import { ApiError, NetworkError } from '../core/errors';
import type { ApiRequestOptions, ApiTransport } from '../types/api';

export interface ApiClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  debug?: boolean;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export class ApiClient implements ApiTransport {
  private readonly options: ApiClientOptions;

  constructor(options: ApiClientOptions) {
    this.options = {
      timeoutMs: 30000,
      debug: false,
      ...options
    };
  }

  async get<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  async post<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, options);
  }

  private async request<T>(method: string, path: string, options: ApiRequestOptions): Promise<T> {
    const timeoutMs = options.timeoutMs ?? this.options.timeoutMs ?? 30000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(options.headers ?? {})
    };

    if (this.options.apiKey) {
      headers.authorization = `Bearer ${this.options.apiKey}`;
    }

    const url = buildUrl(this.options.baseUrl, path, options.query);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      const text = await response.text();
      const parsed = text ? tryJsonParse(text) : undefined;

      if (!response.ok) {
        const message = extractApiMessage(parsed) ?? `Request failed (${response.status})`;
        throw new ApiError(
          message,
          'Check your API key and request arguments, or retry later.',
          response.status,
          parsed
        );
      }

      if (parsed === undefined) {
        return {} as T;
      }

      return parsed as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new NetworkError('Request timed out.', 'Increase the timeout with `--timeout`.', error);
      }

      throw new NetworkError('Network request failed.', 'Check your network connection and API base URL configuration.', error);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function tryJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractApiMessage(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }

  const shape = parsed as Record<string, unknown>;
  const candidate = shape.message ?? shape.error;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }

  return undefined;
}
