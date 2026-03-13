import type { Command } from 'commander';

import { getConfigValue, isConfigKey, setConfigValue } from '../core/config';
import { ValidationError } from '../core/errors';
import { renderOutput } from '../core/output';
import { formatConfigGet, formatConfigSet } from '../formatters/text';
import type { CliContext } from '../types/cli';

interface ConfigCommandOptions {
  json?: boolean;
}

const SUPPORTED_CONFIG_KEYS = ['api-key', 'api-base-url', 'default-format', 'output-dir', 'timeout-ms', 'debug'];

export function registerConfigCommand(program: Command, context: CliContext): void {
  const config = program.command('config').description('Read and update local CLI config');

  config
    .command('get')
    .description('Get a config value by key')
    .argument('<key>', `Config key (${SUPPORTED_CONFIG_KEYS.join(', ')})`)
    .option('--json', 'Output result as JSON')
    .action(async (key: string, options: ConfigCommandOptions) => {
      if (!isConfigKey(key)) {
        throw new ValidationError(
          `Unsupported config key: ${key}`,
          `Use one of: ${SUPPORTED_CONFIG_KEYS.join(', ')}.`
        );
      }

      const value = await getConfigValue(key, context.homeDir);

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: { key, value },
        json: options.json,
        renderText: () => formatConfigGet(key, value)
      });
    });

  config
    .command('set')
    .description('Set a config value by key')
    .argument('<key>', `Config key (${SUPPORTED_CONFIG_KEYS.join(', ')})`)
    .argument('<value>', 'Config value')
    .option('--json', 'Output result as JSON')
    .action(async (key: string, value: string, options: ConfigCommandOptions) => {
      if (!isConfigKey(key)) {
        throw new ValidationError(
          `Unsupported config key: ${key}`,
          `Use one of: ${SUPPORTED_CONFIG_KEYS.join(', ')}.`
        );
      }

      const result = await setConfigValue(key, value, context.homeDir);

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: {
          key,
          field: result.field,
          value: result.value,
          configPath: result.configPath
        },
        json: options.json,
        renderText: () => formatConfigSet(key, result.value, result.configPath)
      });
    });

  config
    .command('keys')
    .description('List all supported config keys')
    .option('--json', 'Output result as JSON')
    .action(async (options: ConfigCommandOptions) => {
      await renderOutput({
        ctx: { stdout: context.stdout },
        data: { keys: SUPPORTED_CONFIG_KEYS },
        json: options.json,
        renderText: () => SUPPORTED_CONFIG_KEYS.join('\n')
      });
    });
}
