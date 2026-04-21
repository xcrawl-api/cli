import { setTimeout as sleep } from 'node:timers/promises';

import { ApiError } from '../core/errors';
import type { OutputFormat } from '../types/config';
import type {
  ApiTransport,
  BatchScrapeExecutionResponse,
  BatchScrapeJobStatus,
  BatchScrapeRequest,
  BatchScrapeStartResponse,
  BatchScrapeStatusResponse,
  RawBatchScrapeResponse,
  RawScrapeResponse,
  ScrapeRequest,
  ScrapeResponse
} from '../types/api';

const TERMINAL_BATCH_SCRAPE_STATUSES = new Set<BatchScrapeJobStatus>(['completed', 'failed']);

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

function buildRequestOptions(request: {
  headers?: Record<string, string>;
  cookies?: string;
}): Record<string, unknown> | undefined {
  const cookies = parseCookieString(request.cookies);
  if (!request.headers && !cookies) {
    return undefined;
  }

  return {
    headers: request.headers,
    cookies
  };
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

function buildScrapeOutput(format: OutputFormat): {
  output: { formats: Array<'markdown' | 'html' | 'screenshot' | 'json'> };
} {
  return {
    output: {
      formats: [mapFormat(format)]
    }
  };
}

function normalizeBatchScrapeStatus(status: string | undefined): BatchScrapeJobStatus {
  if (!status) {
    return 'pending';
  }

  if (status === 'pending' || status === 'running' || status === 'completed' || status === 'failed') {
    return status;
  }

  if (status === 'queued') {
    return 'pending';
  }

  return 'running';
}

function normalizeBatchScrapePage(raw: RawBatchScrapeResponse, jobId: string): BatchScrapeStatusResponse {
  const results = Array.isArray(raw.data?.results)
    ? raw.data.results.map((item) => ({
        url: item.url ?? item.data?.url ?? '',
        status: item.status ?? item.data?.status ?? 'pending',
        resultRef: item.data?.result_ref,
        scrapeId: item.data?.scrape_id
      }))
    : [];

  return {
    jobId: raw.batch_scrape_id ?? jobId,
    status: normalizeBatchScrapeStatus(raw.status),
    totalUrls: raw.total_urls ?? 0,
    completedUrls: raw.completed_urls ?? 0,
    failedUrls: raw.failed_urls ?? 0,
    invalidUrls: raw.invalid_urls ?? [],
    results,
    startedAt: raw.started_at,
    finishedAt: raw.ended_at,
    totalCreditsUsed: raw.total_credits_used
  };
}

function hasMoreBatchScrapePages(raw: RawBatchScrapeResponse): boolean {
  return raw.data?.has_more === true;
}

function nextBatchScrapeOffset(raw: RawBatchScrapeResponse, currentOffset: number): number {
  const limit = raw.data?.limit ?? raw.data?.results?.length ?? 100;
  return currentOffset + limit;
}

export async function scrapeUrl(client: ApiTransport, request: ScrapeRequest): Promise<ScrapeResponse> {
  const format = request.format ?? 'markdown';
  const body: Record<string, unknown> = {
    url: request.url,
    ...buildScrapeOutput(format)
  };

  const requestOptions = buildRequestOptions(request);
  if (requestOptions) {
    body.request = requestOptions;
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

export async function fetchScrapeResult(
  client: ApiTransport,
  scrapeIdOrPath: string,
  format: OutputFormat = 'markdown',
  timeoutMs?: number
): Promise<ScrapeResponse> {
  const path = scrapeIdOrPath.startsWith('/v1/scrape/')
    ? scrapeIdOrPath
    : `/v1/scrape/${encodeURIComponent(scrapeIdOrPath)}`;

  const raw = await client.get<RawScrapeResponse>(path, { timeoutMs });

  return {
    url: raw.url ?? '',
    format,
    content: pickContent(raw, format),
    metadata: raw.data?.metadata
  };
}

export async function startBatchScrape(client: ApiTransport, request: BatchScrapeRequest): Promise<BatchScrapeStartResponse> {
  const format = request.format ?? 'markdown';
  const body: Record<string, unknown> = {
    urls: request.urls,
    batch: {
      max_concurrency: request.maxConcurrency ?? 3,
      ignore_invalid_urls: false
    },
    ...buildScrapeOutput(format)
  };

  const requestOptions = buildRequestOptions(request);
  if (requestOptions) {
    body.request = requestOptions;
  }

  if (request.proxy) {
    body.proxy = {
      location: request.proxy
    };
  }

  const raw = await client.post<RawBatchScrapeResponse>('/v1/batch/scrape', {
    body,
    timeoutMs: request.timeoutMs
  });

  return {
    jobId: raw.batch_scrape_id ?? '',
    status: normalizeBatchScrapeStatus(raw.status)
  };
}

export async function fetchBatchScrapeStatus(
  client: ApiTransport,
  jobId: string,
  options?: { offset?: number; timeoutMs?: number }
): Promise<BatchScrapeStatusResponse> {
  const raw = await client.get<RawBatchScrapeResponse>(`/v1/batch/scrape/${encodeURIComponent(jobId)}`, {
    query: options?.offset !== undefined ? { offset: options.offset } : undefined,
    timeoutMs: options?.timeoutMs
  });

  return normalizeBatchScrapePage(raw, jobId);
}

async function fetchAllBatchScrapeStatusPages(
  client: ApiTransport,
  jobId: string,
  timeoutMs?: number
): Promise<BatchScrapeStatusResponse> {
  let offset = 0;
  const results: BatchScrapeStatusResponse['results'] = [];

  while (true) {
    const raw = await client.get<RawBatchScrapeResponse>(`/v1/batch/scrape/${encodeURIComponent(jobId)}`, {
      query: offset > 0 ? { offset } : undefined,
      timeoutMs
    });

    const normalizedPage = normalizeBatchScrapePage(raw, jobId);
    results.push(...normalizedPage.results);

    if (!hasMoreBatchScrapePages(raw)) {
      return {
        ...normalizedPage,
        results
      };
    }

    offset = nextBatchScrapeOffset(raw, offset);
  }
}

export async function waitForBatchScrapeCompletion(
  client: ApiTransport,
  jobId: string,
  intervalMs: number,
  timeoutMs: number,
  requestTimeoutMs?: number
): Promise<BatchScrapeStatusResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const status = await fetchBatchScrapeStatus(client, jobId, { timeoutMs: requestTimeoutMs });
    if (TERMINAL_BATCH_SCRAPE_STATUSES.has(status.status)) {
      if (status.status === 'completed') {
        return fetchAllBatchScrapeStatusPages(client, jobId, requestTimeoutMs);
      }

      return status;
    }

    await sleep(intervalMs);
  }

  throw new ApiError(
    `Batch scrape job did not finish in time: ${jobId}`,
    'Increase --wait-timeout or retry with a smaller batch.'
  );
}

export async function scrapeUrlsBatch(
  client: ApiTransport,
  request: BatchScrapeRequest,
  intervalMs: number,
  waitTimeoutMs: number
): Promise<BatchScrapeExecutionResponse> {
  const started = await startBatchScrape(client, request);
  const status = await waitForBatchScrapeCompletion(client, started.jobId, intervalMs, waitTimeoutMs, request.timeoutMs);

  if (status.status !== 'completed') {
    throw new ApiError(
      `Batch scrape failed: ${status.jobId}`,
      'Retry the batch, or inspect the target URLs and proxy settings.'
    );
  }

  if (status.failedUrls > 0 || status.invalidUrls.length > 0) {
    throw new ApiError(
      `Batch scrape completed with failures: ${status.failedUrls} failed, ${status.invalidUrls.length} invalid.`,
      'Retry the failed URLs individually, or reduce the batch size and concurrency.'
    );
  }

  const format = request.format ?? 'markdown';
  const results: ScrapeResponse[] = [];

  for (const item of status.results) {
    const ref = item.resultRef ?? (item.scrapeId ? `/v1/scrape/${encodeURIComponent(item.scrapeId)}` : undefined);
    if (!ref) {
      throw new ApiError(
        `Batch scrape result is missing a result reference for ${item.url || 'one URL'}.`,
        'Retry the batch scrape or fetch the job status again later.'
      );
    }

    results.push(await fetchScrapeResult(client, ref, format, request.timeoutMs));
  }

  return {
    job: status,
    results
  };
}
