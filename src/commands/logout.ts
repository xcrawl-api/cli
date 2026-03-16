import type { Command } from 'commander';

import { clearLocalApiKey } from '../core/config';
import { renderOutput } from '../core/output';
import { formatLogoutResult } from '../formatters/text';
import type { CliContext } from '../types/cli';

interface LogoutOptions {
  json?: boolean;
}

export function registerLogoutCommand(program: Command, context: CliContext): void {
  program
    .command('logout')
    .description('Clear the locally saved XCrawl API key')
    .option('--json', 'Output result as JSON')
    .action(async (options: LogoutOptions) => {
      const result = await clearLocalApiKey(context.homeDir);

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: {
          ok: true,
          cleared: result.cleared,
          configPath: result.configPath
        },
        json: options.json,
        renderText: () => formatLogoutResult(result.cleared, result.configPath)
      });
    });
}
