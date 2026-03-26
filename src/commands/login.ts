import type { Command } from 'commander';

import { loginWithApiKey, loginWithBrowser, promptForAuthentication } from '../core/auth';
import { ValidationError } from '../core/errors';
import { renderOutput } from '../core/output';
import { formatLoginSuccess } from '../formatters/text';
import type { CliContext } from '../types/cli';

interface LoginOptions {
  apiKey?: string;
  browser?: boolean;
  json?: boolean;
}

export function registerLoginCommand(program: Command, context: CliContext): void {
  program
    .command('login')
    .description('Authenticate and save the XCrawl API key to local config')
    .option('--api-key <key>', 'XCrawl API Key')
    .option('--browser', 'Authenticate with the XCrawl browser flow')
    .option('--json', 'Output result as JSON')
    .action(async (options: LoginOptions) => {
      if (options.apiKey && options.browser) {
        throw new ValidationError(
          'Choose a single authentication method.',
          'Use either `xcrawl login --browser` or `xcrawl login --api-key <key>`.'
        );
      }

      const authOutput = options.json ? context.stderr : context.stdout;
      const result = options.apiKey
        ? await loginWithApiKey(options.apiKey, context.homeDir)
        : options.browser
          ? await loginWithBrowser(context, authOutput)
          : await promptForAuthentication(context, authOutput);

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: { ok: true, method: result.method, configPath: result.configPath },
        json: options.json,
        renderText: () => formatLoginSuccess(result.configPath)
      });
    });
}
