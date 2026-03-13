import { setTimeout as sleep } from 'node:timers/promises';

import { ApiError } from '../core/errors';
import type {
  ApiTransport,
  CrawlJobStatus,
  CrawlStartRequest,
  CrawlStartResponse,
  CrawlStatusResponse,
  RawCrawlStartResponse,
  RawCrawlStatusResponse
} from '../types/api';

const TERMINAL_CRAWL_STATUSES = new Set<CrawlJobStatus>(['completed', 'failed']);

function normalizeCrawlStatus(status: string | undefined): CrawlJobStatus {
  if (!status) {
    return 'pending';
  }

  if (status === 'pending' || status === 'crawling' || status === 'completed' || status === 'failed') {
    return status;
  }

  if (status === 'queued') {
    return 'pending';
  }

  if (status === 'running') {
    return 'crawling';
  }

  return 'pending';
}

export async function startCrawl(client: ApiTransport, request: CrawlStartRequest): Promise<CrawlStartResponse> {
  const raw = await client.post<RawCrawlStartResponse>('/v1/crawl', {
    body: {
      url: request.url,
      crawler: {
        limit: request.maxPages
      }
    }
  });

  return {
    jobId: raw.crawl_id ?? '',
    url: raw.url ?? request.url,
    status: normalizeCrawlStatus(raw.status)
  };
}

export async function fetchCrawlStatus(client: ApiTransport, jobId: string): Promise<CrawlStatusResponse> {
  const raw = await client.get<RawCrawlStatusResponse>(`/v1/crawl/${encodeURIComponent(jobId)}`);

  const pages = raw.data?.data ?? [];

  return {
    jobId: raw.crawl_id ?? jobId,
    url: raw.url ?? '',
    status: normalizeCrawlStatus(raw.status),
    completedPages: Array.isArray(pages) ? pages.length : undefined,
    failedPages: 0,
    startedAt: raw.started_at,
    finishedAt: raw.ended_at
  };
}

export async function waitForCrawlCompletion(
  client: ApiTransport,
  jobId: string,
  intervalMs: number,
  timeoutMs: number
): Promise<CrawlStatusResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const status = await fetchCrawlStatus(client, jobId);
    if (TERMINAL_CRAWL_STATUSES.has(status.status)) {
      return status;
    }

    await sleep(intervalMs);
  }

  throw new ApiError(
    `Crawl job did not finish in time: ${jobId}`,
    'Increase --wait-timeout or check progress with `xcrawl crawl status <job-id>`.'
  );
}
