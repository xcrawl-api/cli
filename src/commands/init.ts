import type { Command } from 'commander';

import { loginWithApiKey, loginWithBrowser, promptForAuthentication } from '../core/auth';
import { ValidationError } from '../core/errors';
import { renderOutput } from '../core/output';
import { formatLoginSuccess } from '../formatters/text';
import type { CliContext } from '../types/cli';

interface InitOptions {
  apiKey?: string;
  browser?: boolean;
  json?: boolean;
  yes?: boolean;
}

export function registerInitCommand(program: Command, context: CliContext): void {
  program
    .command('init')
    .description('Initialize XCrawl CLI authentication for this machine')
    .option('-y, --yes', 'Skip interactive selection and require an explicit auth method')
    .option('--browser', 'Authenticate with the XCrawl browser flow')
    .option('--api-key <key>', 'Save the XCrawl API key directly')
    .option('--json', 'Output result as JSON')
    .action(async (options: InitOptions) => {
      if (options.apiKey && options.browser) {
        throw new ValidationError(
          'Choose a single authentication method.',
          'Use either `xcrawl init --browser` or `xcrawl init --api-key <key>`.'
        );
      }

      if (options.yes && !options.apiKey && !options.browser) {
        throw new ValidationError(
          'Non-interactive init requires an authentication method.',
          'Run `xcrawl init -y --browser` or `xcrawl init --api-key <key>`.'
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
