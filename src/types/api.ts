import type { OutputFormat } from './config';

export interface ApiRequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface ApiTransport {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  post<T>(path: string, options?: ApiRequestOptions): Promise<T>;
}

export interface WhoAmIResponse {
  id: string;
  email: string;
  name?: string;
  plan?: string;
}

export interface ScrapeRequest {
  url: string;
  format?: OutputFormat;
  timeoutMs?: number;
  waitFor?: string;
  headers?: Record<string, string>;
  cookies?: string;
  proxy?: string;
}

export interface ScrapeResponse {
  url: string;
  format: OutputFormat;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RawScrapeResponse {
  scrape_id?: string;
  endpoint?: string;
  version?: string;
  status?: string;
  url?: string;
  data?: {
    html?: string;
    raw_html?: string;
    markdown?: string;
    summary?: string;
    screenshot?: string;
    json?: unknown;
    metadata?: Record<string, unknown>;
  };
  started_at?: string;
  ended_at?: string;
  total_credits_used?: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  country?: string;
  language?: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
}

export interface RawSearchResultItem {
  title?: string | null;
  url?: string;
  description?: string;
}

export interface RawSearchResponse {
  search_id?: string;
  endpoint?: string;
  version?: string;
  status?: string;
  query?: string;
  data?: {
    data?: RawSearchResultItem[];
  };
  started_at?: string;
  ended_at?: string;
  total_credits_used?: number;
}

export interface CreditsResponse {
  remaining: number;
  used: number;
  total: number;
  resetAt?: string;
}

export interface MapRequest {
  url: string;
  maxDepth?: number;
  limit?: number;
}

export interface MapLink {
  url: string;
  title?: string;
}

export interface MapResponse {
  url: string;
  links: MapLink[];
  total: number;
}

export interface RawMapResponse {
  map_id?: string;
  endpoint?: string;
  version?: string;
  status?: string;
  url?: string;
  data?: {
    links?: Array<string | { url?: string; title?: string }>;
    total_links?: number;
  };
  started_at?: string;
  ended_at?: string;
  total_credits_used?: number;
}
export type CrawlJobStatus = 'pending' | 'crawling' | 'queued' | 'running' | 'completed' | 'failed';

export interface CrawlStartRequest {
  url: string;
  maxPages?: number;
}

export interface CrawlStartResponse {
  jobId: string;
  url: string;
  status: CrawlJobStatus;
}

export interface CrawlStatusResponse {
  jobId: string;
  url: string;
  status: CrawlJobStatus;
  completedPages?: number;
  failedPages?: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface RawCrawlStartResponse {
  crawl_id?: string;
  endpoint?: string;
  version?: string;
  status?: string;
  url?: string;
}

export interface RawCrawlStatusResponse {
  crawl_id?: string;
  endpoint?: string;
  version?: string;
  status?: string;
  url?: string;
  data?: {
    data?: unknown[];
  };
  started_at?: string;
  ended_at?: string;
}
