import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';

import { scrapeUrl, scrapeUrlsBatch } from '../api/scrape';
import { ensureApiKey } from '../core/auth';
import { ValidationError } from '../core/errors';
import { renderOutput, writeBatchOutput } from '../core/output';
import { toStableJson } from '../formatters/json';
import { formatBatchScrapeSummary, formatScrape } from '../formatters/text';
import type { BatchScrapeStatusResponse, ScrapeResponse } from '../types/api';
import type { OutputFormat } from '../types/config';
import type { CliContext } from '../types/cli';
import { toSafeFileName } from '../core/files';
import { parseHeaders, parsePositiveInt, assertHttpUrl } from '../utils/validate';
import { resolveCommandRuntimeConfig, resolveOutputPath } from './shared';

interface ScrapeOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
  format?: OutputFormat;
  waitFor?: string;
  headers?: string;
  cookies?: string;
  proxy?: string;
  input?: string;
  concurrency?: string;
  interval?: string;
  waitTimeout?: string;
}

function extensionFor(format: OutputFormat, jsonMode: boolean): string {
  if (jsonMode) {
    return 'json';
  }

  switch (format) {
    case 'markdown':
      return 'md';
    case 'html':
      return 'html';
    case 'screenshot':
      return 'png';
    case 'json':
      return 'json';
    default:
      return 'txt';
  }
}

async function loadUrlsFromInputFile(inputPath: string, cwd: string): Promise<string[]> {
  const fullPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(cwd, inputPath);
  const content = await readFile(fullPath, 'utf8');

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function registerScrapeCommand(program: Command, context: CliContext): void {
  program
    .command('scrape')
    .description('Scrape one or more URLs')
    .argument('[url...]', 'URL list to scrape')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Output path; treated as a directory for multiple URLs')
    .option('--format <format>', 'Output format: markdown/json/html/screenshot')
    .option('--wait-for <selector>', 'Wait for selector before scraping')
    .option('--headers <k:v,k2:v2>', 'Additional request headers')
    .option('--cookies <cookies>', 'Cookie string')
    .option('--proxy <proxy>', 'Proxy URL')
    .option('--input <path>', 'Read URLs from a newline-delimited file')
    .option('--concurrency <n>', 'Batch scrape concurrency limit (default: 3)')
    .option('--interval <ms>', 'Polling interval in milliseconds for batch scrape mode')
    .option('--wait-timeout <ms>', 'Polling timeout in milliseconds for batch scrape mode')
    .action(async (cliUrls: string[], options: ScrapeOptions) => {
      const fileUrls = options.input ? await loadUrlsFromInputFile(options.input, context.cwd) : [];
      const urls = [...cliUrls, ...fileUrls];

      if (urls.length === 0) {
        throw new ValidationError('No URL provided.', 'Pass URLs as arguments, or use --input <path>.');
      }

      urls.forEach((url) => assertHttpUrl(url));

      const runtime = await resolveCommandRuntimeConfig(context, {
        apiKey: options.apiKey,
        apiBaseUrl: options.apiBaseUrl,
        timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
        debug: options.debug,
        defaultFormat: options.format
      });

      runtime.apiKey = await ensureApiKey(context, runtime.apiKey, { output: context.stderr });

      const format = options.format ?? runtime.defaultFormat;
      const client = context.createApiClient(runtime);
      const outputPath = resolveOutputPath(context, options.output);
      const concurrency = parsePositiveInt(options.concurrency, 'concurrency') ?? 3;
      const intervalMs = parsePositiveInt(options.interval, 'interval') ?? 1000;
      const waitTimeoutMs = parsePositiveInt(options.waitTimeout, 'wait-timeout') ?? 60000;
      const headers = parseHeaders(options.headers);

      let results: ScrapeResponse[];
      let batchJob: BatchScrapeStatusResponse | undefined;

      if (urls.length === 1) {
        results = [
          await scrapeUrl(client, {
            url: urls[0],
            format,
            timeoutMs: runtime.timeoutMs,
            waitFor: options.waitFor,
            headers,
            cookies: options.cookies,
            proxy: options.proxy
          })
        ];
      } else {
        const batch = await scrapeUrlsBatch(
          client,
          {
            urls,
            format,
            timeoutMs: runtime.timeoutMs,
            headers,
            cookies: options.cookies,
            proxy: options.proxy,
            maxConcurrency: concurrency
          },
          intervalMs,
          waitTimeoutMs
        );

        results = batch.results;
        batchJob = batch.job;
      }

      if (results.length > 1 && !options.output && options.json) {
        await renderOutput({
          ctx: { stdout: context.stdout },
          data: results,
          json: true,
          renderText: () => ''
        });
        return;
      }

      if (results.length > 1) {
        if (batchJob && !options.json) {
          context.stdout.write(`${formatBatchScrapeSummary(batchJob)}\n\n`);
        }

        const targetDir = outputPath ?? path.resolve(context.cwd, runtime.outputDir);
        const ext = extensionFor(format, options.json ?? false);
        await writeBatchOutput(
          targetDir,
          results.map((item) => ({
            fileName: `${toSafeFileName(item.url)}.${ext}`,
            content: options.json ? toStableJson(item) : `${formatScrape(item)}\n`
          })),
          context.stdout
        );
        return;
      }

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: results[0],
        json: options.json,
        outputPath,
        renderText: formatScrape
      });
    });
}
