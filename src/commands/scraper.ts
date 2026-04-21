import type { Command } from 'commander';

import { getScraperDefinition, listScrapers, runScraper } from '../api/scraper';
import { ensureApiKey } from '../core/auth';
import { ACCOUNT_API_BASE_URL } from '../core/constants';
import { ValidationError } from '../core/errors';
import { mergeScraperParamEntries, parseScraperParams } from '../core/scraper';
import { renderOutput } from '../core/output';
import {
  formatScraperDefinition,
  formatScraperList,
  formatScraperResponse
} from '../formatters/text';
import type { CliContext } from '../types/cli';
import { parsePositiveInt } from '../utils/validate';
import { resolveCommandRuntimeConfig, resolveOutputPath } from './shared';

interface ScraperOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
  listScrapers?: boolean;
  describe?: boolean;
  param?: string[];
}

function collectValues(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function createMetadataClient(context: CliContext, options: Awaited<ReturnType<typeof resolveCommandRuntimeConfig>>) {
  return context.createApiClient({
    ...options,
    apiKey: undefined,
    apiBaseUrl: ACCOUNT_API_BASE_URL
  });
}

export function registerScraperCommand(program: Command, context: CliContext): void {
  program
    .command('scraper')
    .description('Run a web scraper API or inspect supported scrapers')
    .argument('[scraper]', 'Scraper name, e.g. reddit_user_posts')
    .argument('[params...]', 'Scraper parameters in key=value form')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .option('--list-scrapers', 'List supported web scrapers')
    .option('--describe', 'Show supported parameters and response fields for the selected scraper')
    .option('--param <key=value>', 'Scraper parameter entry, repeatable', collectValues, [])
    .action(async (scraper: string | undefined, positionalParams: string[], options: ScraperOptions) => {
      const mergedParamEntries = mergeScraperParamEntries(positionalParams, options.param);

      if (options.listScrapers && (scraper || options.describe || mergedParamEntries.length > 0)) {
        throw new ValidationError(
          '--list-scrapers cannot be combined with a scraper name or scraper parameters.',
          'Run `xcrawl scraper --list-scrapers` by itself.'
        );
      }

      const runtime = await resolveCommandRuntimeConfig(context, {
        apiKey: options.apiKey,
        apiBaseUrl: options.apiBaseUrl,
        timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
        debug: options.debug
      });
      const outputPath = resolveOutputPath(context, options.output);
      const metadataClient = createMetadataClient(context, runtime);

      if (options.listScrapers) {
        const scrapers = await listScrapers(metadataClient);

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: scrapers,
          json: options.json,
          outputPath,
          renderText: formatScraperList
        });
        return;
      }

      if (!scraper) {
        throw new ValidationError(
          'Scraper name is required.',
          'Pass a scraper such as `reddit_user_posts`, or run `xcrawl scraper --list-scrapers`.'
        );
      }

      const definition = await getScraperDefinition(metadataClient, scraper);

      if (options.describe) {
        if (mergedParamEntries.length > 0) {
          throw new ValidationError(
            '--describe cannot be combined with scraper parameters.',
            'Run `xcrawl scraper <scraper> --describe` to inspect the scraper schema.'
          );
        }

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: definition,
          json: options.json,
          outputPath,
          renderText: formatScraperDefinition
        });
        return;
      }

      const params = parseScraperParams(mergedParamEntries, definition);

      runtime.apiKey = await ensureApiKey(context, runtime.apiKey, { output: context.stderr });
      const result = await runScraper(context.createApiClient(runtime), {
        engine: scraper,
        params
      });

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: result,
        json: options.json,
        outputPath,
        renderText: formatScraperResponse
      });
    });
}
