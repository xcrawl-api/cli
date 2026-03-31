import type { Command } from 'commander';

import { fetchStatus } from '../api/status';
import { ensureApiKey } from '../core/auth';
import { ACCOUNT_API_BASE_URL } from '../core/constants';
import { renderOutput } from '../core/output';
import { formatStatus } from '../formatters/text';
import type { CliContext, StatusOutput } from '../types/cli';
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
    .description('Show account credit package status')
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

      const appKey = await ensureApiKey(context, runtime.apiKey, { output: context.stderr });
      runtime.apiBaseUrl = ACCOUNT_API_BASE_URL;

      const client = context.createApiClient({ ...runtime, apiKey: undefined });
      const outputPath = resolveOutputPath(context, options.output);
      const result = await fetchStatus(client, appKey);
      const output: StatusOutput = {
        ...result,
        cliVersion: context.version
      };

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: output,
        json: options.json,
        outputPath,
        renderText: formatStatus
      });
    });
}
