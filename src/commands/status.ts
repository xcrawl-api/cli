import type { Command } from 'commander';

import { fetchStatus } from '../api/status';
import { requireApiKey } from '../core/auth';
import { ACCOUNT_API_BASE_URL } from '../core/constants';
import { renderOutput } from '../core/output';
import { formatStatus } from '../formatters/text';
import type { CliContext } from '../types/cli';
import { parsePositiveInt } from '../utils/validate';
import { resolveCommandRuntimeConfig, resolveOutputPath } from './shared';

interface StatusOptions {
  apiKey?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
}

export function registerStatusCommand(program: Command, context: CliContext): void {
  program
    .command('status')
    .description('Show account profile and credit package status')
    .option('--api-key <key>', 'Override API key')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .action(async (options: StatusOptions) => {
      const runtime = await resolveCommandRuntimeConfig(context, {
        apiKey: options.apiKey,
        timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
        debug: options.debug
      });

      runtime.apiKey = requireApiKey(runtime.apiKey);
      runtime.apiBaseUrl = ACCOUNT_API_BASE_URL;

      const client = context.createApiClient(runtime);
      const outputPath = resolveOutputPath(context, options.output);
      const result = await fetchStatus(client);

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: result,
        json: options.json,
        outputPath,
        renderText: formatStatus
      });
    });
}
