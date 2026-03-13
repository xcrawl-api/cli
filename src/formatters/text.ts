import type {
  CrawlStartResponse,
  CrawlStatusResponse,
  CreditsResponse,
  MapResponse,
  ScrapeResponse,
  SearchResponse,
  WhoAmIResponse
} from '../types/api';

export function formatLoginSuccess(configPath: string): string {
  return `API key saved to: ${configPath}`;
}

export function formatWhoami(data: WhoAmIResponse): string {
  return [
    `Account: ${data.name ?? 'N/A'}`,
    `Email: ${data.email}`,
    `Plan: ${data.plan ?? 'N/A'}`,
    `ID: ${data.id}`
  ].join('\n');
}

export function formatScrape(data: ScrapeResponse): string {
  const metadata = data.metadata ? `\nMetadata: ${JSON.stringify(data.metadata)}` : '';
  return `URL: ${data.url}\nFormat: ${data.format}\n\n${data.content}${metadata}`;
}

export function formatSearch(data: SearchResponse): string {
  if (data.results.length === 0) {
    return `Query: ${data.query}\nNo results.`;
  }

  const lines = data.results.map((item, index) => {
    const snippet = item.snippet ? `\n   ${item.snippet}` : '';
    return `${index + 1}. ${item.title}\n   ${item.url}${snippet}`;
  });

  return `Query: ${data.query}\n\n${lines.join('\n\n')}`;
}

export function formatCredits(data: CreditsResponse): string {
  return [
    `Remaining: ${data.remaining}`,
    `Used: ${data.used}`,
    `Total: ${data.total}`,
    `Reset At: ${data.resetAt ?? 'N/A'}`
  ].join('\n');
}

export function formatMap(data: MapResponse): string {
  if (data.links.length === 0) {
    return `Source URL: ${data.url}\nTotal links: 0`;
  }

  const lines = data.links.map((link, index) => `${index + 1}. ${link.title ?? 'Untitled'}\n   ${link.url}`);
  return `Source URL: ${data.url}\nTotal links: ${data.total}\n\n${lines.join('\n\n')}`;
}

export function formatCrawlStart(data: CrawlStartResponse): string {
  return [`Job ID: ${data.jobId}`, `URL: ${data.url}`, `Status: ${data.status}`].join('\n');
}

export function formatCrawlStatus(data: CrawlStatusResponse): string {
  return [
    `Job ID: ${data.jobId}`,
    `URL: ${data.url}`,
    `Status: ${data.status}`,
    `Completed pages: ${data.completedPages ?? 0}`,
    `Failed pages: ${data.failedPages ?? 0}`,
    `Started at: ${data.startedAt ?? 'N/A'}`,
    `Finished at: ${data.finishedAt ?? 'N/A'}`
  ].join('\n');
}

export function formatConfigGet(key: string, value: unknown): string {
  return `${key}: ${value === undefined ? 'undefined' : String(value)}`;
}

export function formatConfigSet(key: string, value: unknown, configPath: string): string {
  return [`Updated ${key}: ${String(value)}`, `Config path: ${configPath}`].join('\n');
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DoctorReport {
  version: string;
  checks: DoctorCheck[];
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = report.checks.map((check) => `${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.detail}`);
  return [`XCrawl CLI ${report.version}`, ...lines].join('\n');
}
