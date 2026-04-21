import chalk from 'chalk';

import { formatAuthGettingStarted } from '../core/auth';
import { toStableJson } from './json';
import { renderTable } from './table';
import type {
  CrawlStartResponse,
  CrawlStatusResponse,
  MapResponse,
  SerpEngineDefinition,
  SerpEngineSummary,
  SerpResponse,
  ScrapeResponse,
  SearchResponse
} from '../types/api';
import type { StatusOutput } from '../types/cli';

export function formatLoginSuccess(configPath: string): string {
  return [`API key saved to: ${configPath}`, '', formatAuthGettingStarted()].join('\n');
}

export function formatLogoutResult(cleared: boolean, configPath: string): string {
  if (!cleared) {
    return 'No local API key found. Already logged out.';
  }

  return `API key removed from: ${configPath}`;
}

function formatStatusHeader(version: string, color: boolean): string {
  const brand = color ? chalk.hex('#1ab394')('XCrawl') : 'XCrawl';
  return `${brand} cli v${version}`;
}

export function formatStatus(data: StatusOutput, options?: { color?: boolean }): string {
  const color = options?.color ?? false;

  return [
    formatStatusHeader(data.cliVersion, color),
    '',
    `Credit Level: ${data.creditLevel}`,
    `Total Credits: ${data.totalCredits}`,
    `Remaining Credits: ${data.remainCredits}`,
    `Consumed Credits: ${data.consumedCredits}`,
    `Today Credits: ${data.todayCredits}`,
    `Next Reset At: ${data.nextResetAt ?? 'N/A'}`,
    `Expired At: ${data.expiredAt ?? 'N/A'}`,
    `Package: ${data.packageTitle ?? 'N/A'}`
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

export function formatMap(data: MapResponse): string {
  if (data.links.length === 0) {
    return `Source URL: ${data.url}\nTotal links: 0`;
  }

  const lines = data.links.map((link, index) => `${index + 1}. ${link.url}`);
  return `Source URL: ${data.url}\nTotal links: ${data.total}\n\n${lines.join('\n\n')}`;
}

export function formatSerpEngineList(data: SerpEngineSummary[]): string {
  if (data.length === 0) {
    return 'No SERP engines available.';
  }

  return [
    `Supported SERP engines: ${data.length}`,
    '',
    renderTable(data, [
      { key: 'name', title: 'Name' },
      { key: 'scraper', title: 'Scraper' },
      { key: 'website', title: 'Website' }
    ]),
    '',
    'Inspect one engine with: xcrawl serp <scraper> --describe'
  ].join('\n');
}

export function formatSerpEngineDefinition(data: SerpEngineDefinition): string {
  const parameterLines =
    data.parameters.length === 0
      ? ['No parameters available.']
      : data.parameters.map((parameter) => {
          const requirement = parameter.required ? 'required' : 'optional';
          const description = parameter.description ? ` - ${parameter.description}` : '';
          return `${parameter.name} [${parameter.type}] ${requirement} / ${parameter.group}${description}`;
        });

  return [
    `Name: ${data.name}`,
    `Scraper: ${data.scraper}`,
    `Engine: ${data.engine}`,
    `Website: ${data.website ?? 'N/A'}`,
    `Website URL: ${data.websiteUrl ?? 'N/A'}`,
    `Formats: ${data.formats.length > 0 ? data.formats.join(', ') : 'N/A'}`,
    `Version: ${data.version ?? 'N/A'}`,
    data.description ? `Description: ${data.description}` : undefined,
    '',
    'Parameters:',
    ...parameterLines
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

export function formatSerpResponse(data: SerpResponse): string {
  const metadata = data.search_metadata ?? {};
  const parameters = data.search_parameters ?? {};
  const sections = Object.entries(data)
    .filter(([key]) => !['search_metadata', 'search_parameters', 'total_credits_used'].includes(key))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key} (${value.length})`;
      }

      if (value && typeof value === 'object') {
        return key;
      }

      return `${key}: ${String(value)}`;
    });

  const lines = [
    `Status: ${stringValue(metadata.status) ?? 'N/A'}`,
    `Search ID: ${stringValue(metadata.id) ?? 'N/A'}`,
    `Credits Used: ${data.total_credits_used ?? 'N/A'}`,
    `Parameters: ${Object.keys(parameters).join(', ') || 'N/A'}`,
    sections.length > 0 ? `Sections: ${sections.join(', ')}` : 'Sections: none',
    '',
    toStableJson(data).trimEnd()
  ];

  return lines.join('\n');
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

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}
