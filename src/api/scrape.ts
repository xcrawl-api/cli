import type { OutputFormat } from '../types/config';
import type { ApiTransport, RawScrapeResponse, ScrapeRequest, ScrapeResponse } from '../types/api';

function mapFormat(format: OutputFormat): 'markdown' | 'html' | 'screenshot' | 'json' {
  switch (format) {
    case 'html':
      return 'html';
    case 'screenshot':
      return 'screenshot';
    case 'json':
      return 'json';
    default:
      return 'markdown';
  }
}

function parseCookieString(input: string | undefined): Record<string, string> | undefined {
  if (!input) {
    return undefined;
  }

  const cookies: Record<string, string> = {};
  for (const pair of input.split(';')) {
    const [rawKey, ...rawValue] = pair.trim().split('=');
    const key = rawKey?.trim();
    const value = rawValue.join('=').trim();
    if (key && value) {
      cookies[key] = value;
    }
  }

  return Object.keys(cookies).length > 0 ? cookies : undefined;
}

function pickContent(raw: RawScrapeResponse, format: OutputFormat): string {
  const data = raw.data ?? {};

  if (format === 'html') {
    return data.html ?? data.raw_html ?? '';
  }

  if (format === 'screenshot') {
    return data.screenshot ?? '';
  }

  if (format === 'json') {
    return data.json !== undefined ? JSON.stringify(data.json, null, 2) : '';
  }

  return data.markdown ?? data.summary ?? data.html ?? '';
}

export async function scrapeUrl(client: ApiTransport, request: ScrapeRequest): Promise<ScrapeResponse> {
  const format = request.format ?? 'markdown';

  const body: Record<string, unknown> = {
    url: request.url,
    output: {
      formats: [mapFormat(format)]
    }
  };

  const cookies = parseCookieString(request.cookies);
  if (request.headers || cookies) {
    body.request = {
      headers: request.headers,
      cookies
    };
  }

  if (request.proxy) {
    body.proxy = {
      location: request.proxy
    };
  }

  const raw = await client.post<RawScrapeResponse>('/v1/scrape', {
    body,
    timeoutMs: request.timeoutMs
  });

  return {
    url: raw.url ?? request.url,
    format,
    content: pickContent(raw, format),
    metadata: raw.data?.metadata
  };
}
