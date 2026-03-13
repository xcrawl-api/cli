import type { Command } from 'commander';

import { fetchWhoAmI } from '../api/whoami';
import { getConfigPath, saveLocalConfig } from '../core/config';
import { renderOutput } from '../core/output';
import { formatDoctorReport, type DoctorReport } from '../formatters/text';
import type { CliContext } from '../types/cli';
import { parsePositiveInt } from '../utils/validate';
import {
  isAccountEndpointUnavailable,
  resolveCommandRuntimeConfig,
  resolveOutputPath
} from './shared';

interface DoctorOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
}

function checkNodeVersion(): { ok: boolean; detail: string } {
  const raw = process.versions.node;
  const major = Number.parseInt(raw.split('.')[0], 10);

  if (major >= 18) {
    return { ok: true, detail: raw };
  }

  return { ok: false, detail: `${raw} (requires Node >= 18)` };
}

export function registerDoctorCommand(program: Command, context: CliContext): void {
  program
    .command('doctor')
    .description('Run local diagnostics and connectivity checks')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .action(async (options: DoctorOptions) => {
      const runtime = await resolveCommandRuntimeConfig(context, {
        apiKey: options.apiKey,
        apiBaseUrl: options.apiBaseUrl,
        timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
        debug: options.debug
      });

      const configPath = getConfigPath(context.homeDir);
      const node = checkNodeVersion();
      const report: DoctorReport = {
        version: context.version,
        checks: [
          {
            name: 'node_version',
            ok: node.ok,
            detail: node.detail
          }
        ]
      };

      try {
        await saveLocalConfig({}, context.homeDir);
        report.checks.push({
          name: 'config_rw',
          ok: true,
          detail: configPath
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to access config file';
        report.checks.push({
          name: 'config_rw',
          ok: false,
          detail: message
        });
      }

      if (runtime.apiKey) {
        try {
          const client = context.createApiClient(runtime);
          await fetchWhoAmI(client);
          report.checks.push({
            name: 'api_connectivity',
            ok: true,
            detail: 'whoami check passed'
          });
        } catch (error) {
          if (isAccountEndpointUnavailable(error, runtime.apiBaseUrl)) {
            report.checks.push({
              name: 'api_connectivity',
              ok: true,
              detail: 'Authenticated API reachable (public account endpoint is unavailable on run API).'
            });
            const outputPath = resolveOutputPath(context, options.output);

            await renderOutput({
              ctx: { stdout: context.stdout },
              data: report,
              json: options.json,
              outputPath,
              renderText: formatDoctorReport
            });
            return;
          }

          const message = error instanceof Error ? error.message : 'whoami check failed';
          report.checks.push({
            name: 'api_connectivity',
            ok: false,
            detail: message
          });
        }
      } else {
        report.checks.push({
          name: 'api_key',
          ok: false,
          detail: 'API key not found (configure via login or XCRAWL_API_KEY)'
        });
      }
      const outputPath = resolveOutputPath(context, options.output);

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: report,
        json: options.json,
        outputPath,
        renderText: formatDoctorReport
      });
    });
}
