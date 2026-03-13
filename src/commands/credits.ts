import type { Command } from 'commander';

import { fetchCredits } from '../api/credits';
import { requireApiKey } from '../core/auth';
import { renderOutput } from '../core/output';
import { formatCredits } from '../formatters/text';
import type { CliContext } from '../types/cli';
import { parsePositiveInt } from '../utils/validate';
import {
  isAccountEndpointUnavailable,
  resolveCommandRuntimeConfig,
  resolveOutputPath
} from './shared';

interface CreditsOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
}

export function registerCreditsCommand(program: Command, context: CliContext): void {
  program
    .command('credits')
    .description('Show account credits and usage')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .action(async (options: CreditsOptions) => {
      const runtime = await resolveCommandRuntimeConfig(context, {
        apiKey: options.apiKey,
        apiBaseUrl: options.apiBaseUrl,
        timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
        debug: options.debug
      });

      runtime.apiKey = requireApiKey(runtime.apiKey);
      const client = context.createApiClient(runtime);
      const outputPath = resolveOutputPath(context, options.output);
      try {
        const result = await fetchCredits(client);

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: result,
          json: options.json,
          outputPath,
          renderText: formatCredits
        });
        return;
      } catch (error) {
        if (!isAccountEndpointUnavailable(error, runtime.apiBaseUrl)) {
          throw error;
        }

        const fallback = {
          apiBaseUrl: runtime.apiBaseUrl,
          supported: false,
          note: 'Public API does not expose a standalone credits endpoint. Read total_credits_used from task responses.'
        };

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: fallback,
          json: options.json,
          outputPath,
          renderText: (data) => `Credits endpoint unavailable on ${data.apiBaseUrl}. ${data.note}`
        });
      }
    });
}
