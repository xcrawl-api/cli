import type { Command } from 'commander';

import { fetchMap } from '../api/map';
import { requireApiKey } from '../core/auth';
import { renderOutput } from '../core/output';
import { formatMap } from '../formatters/text';
import type { CliContext } from '../types/cli';
import { assertHttpUrl, parsePositiveInt } from '../utils/validate';
import { resolveCommandRuntimeConfig, resolveOutputPath } from './shared';

interface MapOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
  maxDepth?: string;
  limit?: string;
}

export function registerMapCommand(program: Command, context: CliContext): void {
  program
    .command('map')
    .description('Generate site map links for a URL')
    .argument('<url>', 'Target URL')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .option('--max-depth <n>', 'Maximum traversal depth')
    .option('--limit <n>', 'Maximum number of links')
    .action(async (url: string, options: MapOptions) => {
      assertHttpUrl(url);

      const runtime = await resolveCommandRuntimeConfig(context, {
        apiKey: options.apiKey,
        apiBaseUrl: options.apiBaseUrl,
        timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
        debug: options.debug
      });

      runtime.apiKey = requireApiKey(runtime.apiKey);
      const client = context.createApiClient(runtime);

      const result = await fetchMap(client, {
        url,
        maxDepth: parsePositiveInt(options.maxDepth, 'max-depth'),
        limit: parsePositiveInt(options.limit, 'limit')
      });

      const outputPath = resolveOutputPath(context, options.output);

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: result,
        json: options.json,
        outputPath,
        renderText: formatMap
      });
    });
}
