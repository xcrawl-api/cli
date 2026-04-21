import type { Command } from 'commander';

import { getSerpEngineDefinition, listSerpEngines, runSerp } from '../api/serp';
import { ensureApiKey } from '../core/auth';
import { ACCOUNT_API_BASE_URL } from '../core/constants';
import { ValidationError } from '../core/errors';
import { mergeSerpParamEntries, parseSerpParams } from '../core/serp';
import { renderOutput } from '../core/output';
import {
  formatSerpEngineDefinition,
  formatSerpEngineList,
  formatSerpResponse
} from '../formatters/text';
import type { CliContext } from '../types/cli';
import { parsePositiveInt } from '../utils/validate';
import { resolveCommandRuntimeConfig, resolveOutputPath } from './shared';

interface SerpOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
  listEngines?: boolean;
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

export function registerSerpCommand(program: Command, context: CliContext): void {
  program
    .command('serp')
    .description('Run a SERP engine or inspect supported SERP engines')
    .argument('[engine]', 'SERP engine scraper, e.g. google_search')
    .argument('[params...]', 'SERP parameters in key=value form')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .option('--list-engines', 'List supported SERP engines')
    .option('--describe', 'Show supported parameters for the selected engine')
    .option('--param <key=value>', 'SERP parameter entry, repeatable', collectValues, [])
    .action(async (engine: string | undefined, positionalParams: string[], options: SerpOptions) => {
      const mergedParamEntries = mergeSerpParamEntries(positionalParams, options.param);

      if (options.listEngines && (engine || options.describe || mergedParamEntries.length > 0)) {
        throw new ValidationError(
          '--list-engines cannot be combined with an engine or SERP parameters.',
          'Run `xcrawl serp --list-engines` by itself.'
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

      if (options.listEngines) {
        const engines = await listSerpEngines(metadataClient);

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: engines,
          json: options.json,
          outputPath,
          renderText: formatSerpEngineList
        });
        return;
      }

      if (!engine) {
        throw new ValidationError(
          'SERP engine is required.',
          'Pass an engine scraper such as `google_search`, or run `xcrawl serp --list-engines`.'
        );
      }

      const definition = await getSerpEngineDefinition(metadataClient, engine);

      if (options.describe) {
        if (mergedParamEntries.length > 0) {
          throw new ValidationError(
            '--describe cannot be combined with SERP parameters.',
            'Run `xcrawl serp <engine> --describe` to inspect the engine schema.'
          );
        }

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: definition,
          json: options.json,
          outputPath,
          renderText: formatSerpEngineDefinition
        });
        return;
      }

      const params = parseSerpParams(mergedParamEntries, definition);

      runtime.apiKey = await ensureApiKey(context, runtime.apiKey, { output: context.stderr });
      const result = await runSerp(context.createApiClient(runtime), {
        engine,
        params
      });

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: result,
        json: options.json,
        outputPath,
        renderText: formatSerpResponse
      });
    });
}
