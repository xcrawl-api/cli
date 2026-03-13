import type { Command } from 'commander';

import { fetchWhoAmI } from '../api/whoami';
import { requireApiKey } from '../core/auth';
import { renderOutput } from '../core/output';
import { formatWhoami } from '../formatters/text';
import type { CliContext } from '../types/cli';
import { parsePositiveInt } from '../utils/validate';
import {
  isAccountEndpointUnavailable,
  resolveCommandRuntimeConfig,
  resolveOutputPath
} from './shared';

interface WhoamiOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
}

export function registerWhoamiCommand(program: Command, context: CliContext): void {
  program
    .command('whoami')
    .description('Show the current account info')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .action(async (options: WhoamiOptions) => {
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
        const result = await fetchWhoAmI(client);

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: result,
          json: options.json,
          outputPath,
          renderText: formatWhoami
        });
        return;
      } catch (error) {
        if (!isAccountEndpointUnavailable(error, runtime.apiBaseUrl)) {
          throw error;
        }

        const fallback = {
          apiBaseUrl: runtime.apiBaseUrl,
          apiKeyConfigured: true,
          supported: false,
          note: 'Public API does not provide a whoami endpoint. Use dashboard for account details.'
        };

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: fallback,
          json: options.json,
          outputPath,
          renderText: (data) => `Whoami endpoint unavailable on ${data.apiBaseUrl}. ${data.note}`
        });
      }
    });
}
