import type { LlmModelDefinition } from '../types/api';
import { mergeSchemaParamEntries, parseSchemaParams } from './schema-params';

export function mergeLlmParamEntries(positionalEntries: string[], optionEntries: string[] = []): string[] {
  return mergeSchemaParamEntries(positionalEntries, optionEntries);
}

export function parseLlmParams(entries: string[], definition: LlmModelDefinition): Record<string, unknown> {
  return parseSchemaParams(
    entries,
    {
      id: definition.scraper,
      parameters: definition.parameters
    },
    {
      invalidEntry: 'Use key=value, for example `prompt=What is XCrawl CLI?` or `--param location=US`.',
      unsupportedParameter: (name, definitionId) => ({
        message: `Unsupported LLM parameter: ${name}.`,
        hint: `Run \`xcrawl llm ${definitionId} --describe\` to inspect supported parameters.`
      }),
      duplicateParameter: (name) => ({
        message: `Duplicate LLM parameter: ${name}.`,
        hint: 'Pass each LLM parameter only once.'
      }),
      missingRequired: (names, definitionId) => ({
        message: `Missing required LLM parameter: ${names.join(', ')}.`,
        hint: `Run \`xcrawl llm ${definitionId} --describe\` to inspect required parameters.`
      }),
      invalidBoolean: (name) => ({
        message: `${name} must be a boolean.`,
        hint: `Pass true/false, yes/no, or 1/0 for ${name}.`
      }),
      invalidNumber: (name) => ({
        message: `${name} must be a number.`,
        hint: `Pass a numeric value for ${name}.`
      }),
      invalidInteger: (name) => ({
        message: `${name} must be an integer.`,
        hint: `Pass an integer value for ${name}.`
      }),
      invalidJson: (name, expectedType) => ({
        message: `${name} must be valid JSON.`,
        hint: `Pass a JSON ${expectedType} for ${name}.`
      }),
      invalidEnum: (name, examples) => ({
        message: `${name} must be one of the supported values.`,
        hint:
          examples.length > 0
            ? `Examples for ${name}: ${examples.join(', ')}.`
            : 'Inspect the model metadata with `xcrawl llm <model> --describe`.'
      })
    }
  );
}
