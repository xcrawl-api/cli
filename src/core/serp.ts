import { ValidationError } from './errors';
import type { SerpEngineDefinition, SerpParameterDefinition } from '../types/api';

const BOOLEAN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

export function mergeSerpParamEntries(positionalEntries: string[], optionEntries: string[] = []): string[] {
  return [...positionalEntries, ...optionEntries];
}

export function parseSerpParams(entries: string[], definition: SerpEngineDefinition): Record<string, unknown> {
  const supported = new Map(definition.parameters.map((parameter) => [parameter.name, parameter]));
  const params: Record<string, unknown> = {};

  for (const entry of entries) {
    const { key, value } = splitEntry(entry);
    const parameter = supported.get(key);

    if (!parameter) {
      throw new ValidationError(
        `Unsupported SERP parameter: ${key}.`,
        `Run \`xcrawl serp ${definition.scraper} --describe\` to inspect supported parameters.`
      );
    }

    if (Object.prototype.hasOwnProperty.call(params, key)) {
      throw new ValidationError(
        `Duplicate SERP parameter: ${key}.`,
        'Pass each SERP parameter only once.'
      );
    }

    params[key] = coerceSerpParamValue(value, parameter);
  }

  const missing = definition.parameters.filter((parameter) => parameter.required && !(parameter.name in params));

  if (missing.length > 0) {
    const missingNames = missing.map((parameter) => parameter.name).join(', ');
    throw new ValidationError(
      `Missing required SERP parameter: ${missingNames}.`,
      `Run \`xcrawl serp ${definition.scraper} --describe\` to inspect required parameters.`
    );
  }

  return params;
}

function splitEntry(entry: string): { key: string; value: string } {
  const separatorIndex = entry.indexOf('=');

  if (separatorIndex <= 0) {
    throw new ValidationError(
      `Invalid SERP parameter: ${entry}.`,
      'Use key=value, for example `q=xcrawl` or `--param page=2`.'
    );
  }

  const key = entry.slice(0, separatorIndex).trim();
  const value = entry.slice(separatorIndex + 1);

  if (!key) {
    throw new ValidationError(
      `Invalid SERP parameter: ${entry}.`,
      'Use key=value, for example `q=xcrawl` or `--param page=2`.'
    );
  }

  return { key, value };
}

function coerceSerpParamValue(value: string, definition: SerpParameterDefinition): unknown {
  switch (definition.type) {
    case 'boolean':
      return parseBoolean(value, definition.name);
    case 'number':
      return parseNumber(value, definition);
    case 'integer':
      return parseInteger(value, definition);
    case 'array':
      return parseStructuredJson(value, definition.name, 'array');
    case 'object':
      return parseStructuredJson(value, definition.name, 'object');
    default:
      return validateEnum(value, definition);
  }
}

function parseBoolean(value: string, fieldName: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (BOOLEAN_TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (BOOLEAN_FALSE_VALUES.has(normalized)) {
    return false;
  }

  throw new ValidationError(
    `${fieldName} must be a boolean.`,
    `Pass true/false, yes/no, or 1/0 for ${fieldName}.`
  );
}

function parseNumber(value: string, definition: SerpParameterDefinition): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(
      `${definition.name} must be a number.`,
      `Pass a numeric value for ${definition.name}.`
    );
  }

  return validateEnum(parsed, definition) as number;
}

function parseInteger(value: string, definition: SerpParameterDefinition): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new ValidationError(
      `${definition.name} must be an integer.`,
      `Pass an integer value for ${definition.name}.`
    );
  }

  return validateEnum(parsed, definition) as number;
}

function parseStructuredJson(value: string, fieldName: string, expectedType: 'array' | 'object'): unknown {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (expectedType === 'array' && Array.isArray(parsed)) {
      return parsed;
    }

    if (expectedType === 'object' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    throw new ValidationError(
      `${fieldName} must be valid JSON.`,
      `Pass a JSON ${expectedType} for ${fieldName}.`,
      error
    );
  }

  throw new ValidationError(
    `${fieldName} must be a JSON ${expectedType}.`,
    `Pass a JSON ${expectedType} for ${fieldName}.`
  );
}

function validateEnum(value: unknown, definition: SerpParameterDefinition): unknown {
  const allowedValues = definition.enumValues;

  if (!allowedValues || allowedValues.length === 0) {
    return value;
  }

  if (allowedValues.includes(value)) {
    return value;
  }

  const examples = allowedValues
    .filter((item) => item !== '')
    .slice(0, 5)
    .map((item) => String(item))
    .join(', ');

  throw new ValidationError(
    `${definition.name} must be one of the supported values.`,
    examples.length > 0
      ? `Examples for ${definition.name}: ${examples}.`
      : `Inspect the engine metadata with \`xcrawl serp <engine> --describe\`.`
  );
}
