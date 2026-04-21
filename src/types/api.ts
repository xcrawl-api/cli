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

export interface CliAuthStatusResponse {
  code?: string | number;
  message?: string;
  msg?: string;
  data?: {
    api_key?: string;
  };
}

export interface StatusResponse {
  creditLevel: number;
  totalCredits: number;
  remainCredits: number;
  consumedCredits: number;
  todayCredits: number;
  nextResetAt?: string | null;
  expiredAt?: string | null;
  packageTitle?: string | null;
}

export interface RawStatusData {
  credit_level?: number;
  total_credits?: number;
  remain_credits?: number;
  consumed_credits?: number;
  today_credits?: number;
  next_reset_at?: string | null;
  expired_at?: string | null;
  package_title?: string | null;
}

export interface RawStatusEnvelope {
  code?: number;
  msg?: string;
  data?: RawStatusData;
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

export interface SerpEngineSummary {
  scraper: string;
  name: string;
  website: string;
  domain?: string;
  description?: string;
}

export interface RawSerpEngineSummary {
  scraper?: string;
  website?: string;
  domain?: string;
  name?: string;
  desc?: string;
}

export interface RawSerpEngineListEnvelope {
  code?: number;
  msg?: string;
  data?: {
    list?: RawSerpEngineSummary[];
  } | null;
}

export interface RawSerpParameterSchema {
  must?: boolean;
  name?: string;
  type?: string;
  default?: unknown;
  enum?: unknown[];
  class_name?: string;
  description?: string;
}

export interface RawSerpRequestSchema {
  type?: string;
  title?: string;
  engine?: string;
  required?: string[];
  additionalProperties?: boolean;
  properties?: Record<string, RawSerpParameterSchema>;
}

export interface RawSerpEngineInfo {
  desc?: string;
  icon?: string;
  name?: string;
  engine?: string;
  format?: string[];
  version?: string;
  website?: string;
  website_url?: string;
  request_params?: RawSerpRequestSchema;
}

export interface RawSerpEngineInfoEnvelope {
  code?: number;
  msg?: string;
  data?: RawSerpEngineInfo | null;
}

export interface SerpParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  group: string;
  description?: string;
  defaultValue?: unknown;
  enumValues?: unknown[];
}

export interface SerpEngineDefinition {
  scraper: string;
  name: string;
  engine: string;
  description?: string;
  website?: string;
  websiteUrl?: string;
  formats: string[];
  version?: string;
  parameters: SerpParameterDefinition[];
}

export interface SerpRequest {
  engine: string;
  params: Record<string, unknown>;
}

export interface SerpResponse extends Record<string, unknown> {
  search_metadata?: Record<string, unknown>;
  search_parameters?: Record<string, unknown>;
  total_credits_used?: number;
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
