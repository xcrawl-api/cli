import type { Command } from 'commander';

import { getLlmModelDefinition, listLlmModels, runLlm } from '../api/llm';
import { ensureApiKey } from '../core/auth';
import { ACCOUNT_API_BASE_URL } from '../core/constants';
import { ValidationError } from '../core/errors';
import { mergeLlmParamEntries, parseLlmParams } from '../core/llm';
import { renderOutput } from '../core/output';
import { formatLlmModelDefinition, formatLlmModelList, formatLlmResponse } from '../formatters/text';
import type { CliContext } from '../types/cli';
import { parsePositiveInt } from '../utils/validate';
import { resolveCommandRuntimeConfig, resolveOutputPath } from './shared';

interface LlmOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: string;
  debug?: boolean;
  json?: boolean;
  output?: string;
  listModels?: boolean;
  describe?: boolean;
  param?: string[];
}

function collectValues(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function createMetadataClient(context: CliContext, options: Awaited<ReturnType<typeof resolveCommandRuntimeConfig>>) {
  return context.createApiClient({
    ...options,
    apiKey: undefined,
    apiBaseUrl: ACCOUNT_API_BASE_URL
  });
}

export function registerLlmCommand(program: Command, context: CliContext): void {
  program
    .command('llm')
    .description('Run an LLM-powered web search or inspect supported LLM models')
    .argument('[model]', 'LLM model name, e.g. chatgpt_model')
    .argument('[params...]', 'LLM parameters in key=value form')
    .option('--api-key <key>', 'Override API key')
    .option('--api-base-url <url>', 'Override API base URL')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--debug', 'Enable debug output')
    .option('--json', 'Output result as JSON')
    .option('--output <path>', 'Save output to a file')
    .option('--list-models', 'List supported LLM models')
    .option('--describe', 'Show supported parameters for the selected LLM model')
    .option('--param <key=value>', 'LLM parameter entry, repeatable', collectValues, [])
    .action(async (model: string | undefined, positionalParams: string[], options: LlmOptions) => {
      const mergedParamEntries = mergeLlmParamEntries(positionalParams, options.param);

      if (options.listModels && (model || options.describe || mergedParamEntries.length > 0)) {
        throw new ValidationError(
          '--list-models cannot be combined with a model name or LLM parameters.',
          'Run `xcrawl llm --list-models` by itself.'
        );
      }

      const runtime = await resolveCommandRuntimeConfig(context, {
        apiKey: options.apiKey,
        apiBaseUrl: options.apiBaseUrl,
        timeoutMs: parsePositiveInt(options.timeout, 'timeout'),
        debug: options.debug
      });
      const outputPath = resolveOutputPath(context, options.output);
      const metadataClient = createMetadataClient(context, runtime);

      if (options.listModels) {
        const models = await listLlmModels(metadataClient);

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: models,
          json: options.json,
          outputPath,
          renderText: formatLlmModelList
        });
        return;
      }

      if (!model) {
        throw new ValidationError(
          'LLM model name is required.',
          'Pass a model such as `chatgpt_model`, or run `xcrawl llm --list-models`.'
        );
      }

      const definition = await getLlmModelDefinition(metadataClient, model);

      if (options.describe) {
        if (mergedParamEntries.length > 0) {
          throw new ValidationError(
            '--describe cannot be combined with LLM parameters.',
            'Run `xcrawl llm <model> --describe` to inspect the model schema.'
          );
        }

        await renderOutput({
          ctx: { stdout: context.stdout },
          data: definition,
          json: options.json,
          outputPath,
          renderText: formatLlmModelDefinition
        });
        return;
      }

      const params = parseLlmParams(mergedParamEntries, definition);

      runtime.apiKey = await ensureApiKey(context, runtime.apiKey, { output: context.stderr });
      const result = await runLlm(context.createApiClient(runtime), {
        engine: model,
        params
      });

      await renderOutput({
        ctx: { stdout: context.stdout },
        data: result,
        json: options.json,
        outputPath,
        renderText: formatLlmResponse
      });
    });
}
