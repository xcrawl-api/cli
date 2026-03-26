import type { Command } from 'commander';

import { searchWeb } from '../api/search';
import { ensureApiKey } from '../core/auth';
import { renderOutput } from '../core/output';
import { renderTable } from '../formatters/table';
import { formatSearch } from '../formatters/text';
import type { SearchResponse } from '../types/api';
import type { CliContext } from '../types/cli';
import { parsePositiveInt } from '../utils/validate';
import { resolveCommandRuntimeConfig, resolveOutputPath } from './shared';

interface SearchOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
  limit?: string;
  country?: string;
  language?: string;
}

function formatSearchHuman(data: SearchResponse): string {
  if (data.results.length === 0) {
    return formatSearch(data);
  }

  return [
    `Query: ${data.query}`,
    '',
    renderTable(data.results, [
      { key: 'title', title: 'Title' },
      { key: 'url', title: 'URL' }
    ])
  ].join('\n');
}

export function registerSearchCommand(program: Command, context: CliContext): void {
  program
    .command('search')
    .description('Run a web search')
    .argument('<query...>', 'Search query')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .option('--limit <n>', 'Result limit, default is 10')
    .option('--country <country>', 'Country code, e.g. US')
    .option('--language <language>', 'Language code, e.g. en')
    .action(async (queryParts: string[], options: SearchOptions) => {
      const query = queryParts.join(' ').trim();

      const runtime = await resolveCommandRuntimeConfig(context, {
        apiKey: options.apiKey,
        apiBaseUrl: options.apiBaseUrl,
        timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
        debug: options.debug
      });

      runtime.apiKey = await ensureApiKey(context, runtime.apiKey, { output: context.stderr });
      const client = context.createApiClient(runtime);

      const result = await searchWeb(client, {
        query,
        limit: parsePositiveInt(options.limit, 'limit') ?? 10,
        country: options.country,
        language: options.language
      });
      const outputPath = resolveOutputPath(context, options.output);

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: result,
        json: options.json,
        outputPath,
        renderText: formatSearchHuman
      });
    });
}
