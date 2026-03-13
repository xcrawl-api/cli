import type { Command } from 'commander';

import { saveLocalConfig } from '../core/config';
import { ValidationError } from '../core/errors';
import { renderOutput } from '../core/output';
import { formatLoginSuccess } from '../formatters/text';
import type { CliContext } from '../types/cli';

interface LoginOptions {
  apiKey?: string;
  json?: boolean;
}

export function registerLoginCommand(program: Command, context: CliContext): void {
  program
    .command('login')
    .description('Save the XCrawl API key to local config')
    .option('--api-key <key>', 'XCrawl API Key')
    .option('--json', 'Output result as JSON')
    .action(async (options: LoginOptions) => {
      if (!options.apiKey || options.apiKey.trim().length === 0) {
        throw new ValidationError('Missing required argument: api-key.', 'Run `xcrawl login --api-key <key>`.');
      }

      const configPath = await saveLocalConfig({ apiKey: options.apiKey }, context.homeDir);
      await renderOutput({
        ctx: { stdout: context.stdout },
        data: { ok: true, configPath },
        json: options.json,
        renderText: () => formatLoginSuccess(configPath)
      });
    });
}
