import type { Command } from 'commander';

import { fetchCrawlStatus, startCrawl, waitForCrawlCompletion } from '../api/crawl';
import { ensureApiKey } from '../core/auth';
import { ValidationError } from '../core/errors';
import { renderOutput } from '../core/output';
import { formatCrawlStart, formatCrawlStatus } from '../formatters/text';
import type { CliContext } from '../types/cli';
import { assertHttpUrl, parsePositiveInt } from '../utils/validate';
import { resolveCommandRuntimeConfig, resolveOutputPath } from './shared';

interface CrawlStartOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
  wait?: boolean;
  interval?: string;
  waitTimeout?: string;
  maxPages?: string;
}

interface CrawlStatusOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
}

function addCommonCrawlOptions<T extends Command>(command: T): T {
  return command
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file');
}

export function registerCrawlCommand(program: Command, context: CliContext): void {
  const crawl = program.command('crawl').description('Start crawl jobs and query job status');

  addCommonCrawlOptions(
    crawl
      .command('start')
      .description('Start a crawl job for a target URL')
      .argument('<url>', 'Target URL')
      .option('--wait', 'Wait until the job reaches a terminal status')
      .option('--interval <ms>', 'Polling interval in milliseconds (default: 2000)')
      .option('--wait-timeout <ms>', 'Polling timeout in milliseconds (default: 60000)')
      .option('--max-pages <n>', 'Maximum pages to crawl')
  ).action(async (url: string, options: CrawlStartOptions) => {
    assertHttpUrl(url);

    const runtime = await resolveCommandRuntimeConfig(context, {
      apiKey: options.apiKey,
      apiBaseUrl: options.apiBaseUrl,
      timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
      debug: options.debug
    });

    runtime.apiKey = await ensureApiKey(context, runtime.apiKey, { output: context.stderr });
    const client = context.createApiClient(runtime);
    const outputPath = resolveOutputPath(context, options.output);

    const started = await startCrawl(client, {
      url,
      maxPages: parsePositiveInt(options.maxPages, 'max-pages')
    });

    if (!options.wait) {
      await renderOutput({
        ctx: { stdout: context.stdout },
        data: started,
        json: options.json,
        outputPath,
        renderText: formatCrawlStart
      });
      return;
    }

    const intervalMs = parsePositiveInt(options.interval, 'interval') ?? 2000;
    const waitTimeoutMs = parsePositiveInt(options.waitTimeout, 'wait-timeout') ?? 60000;
    const status = await waitForCrawlCompletion(client, started.jobId, intervalMs, waitTimeoutMs);

    await renderOutput({
      ctx: { stdout: context.stdout },
      data: status,
      json: options.json,
      outputPath,
      renderText: formatCrawlStatus
    });
  });

  addCommonCrawlOptions(
    crawl
      .command('status')
      .description('Fetch crawl job status by job id')
      .argument('<job-id>', 'Crawl job id')
  ).action(async (jobId: string, options: CrawlStatusOptions) => {
    const runtime = await resolveCommandRuntimeConfig(context, {
      apiKey: options.apiKey,
      apiBaseUrl: options.apiBaseUrl,
      timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
      debug: options.debug
    });

    runtime.apiKey = await ensureApiKey(context, runtime.apiKey, { output: context.stderr });
    const client = context.createApiClient(runtime);
    const outputPath = resolveOutputPath(context, options.output);
    const status = await fetchCrawlStatus(client, jobId);

    await renderOutput({
      ctx: { stdout: context.stdout },
      data: status,
      json: options.json,
      outputPath,
      renderText: formatCrawlStatus
    });
  });

  crawl.action(() => {
    throw new ValidationError(
      'Missing crawl action.',
      'Run `xcrawl crawl <url>` (shorthand) or `xcrawl crawl start <url>`, or check `xcrawl crawl --help`.'
    );
  });
}
