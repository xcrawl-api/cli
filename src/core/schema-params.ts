import { ValidationError } from './errors';

export interface SchemaParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  enumValues?: unknown[];
}

export interface SchemaContainerDefinition {
  id: string;
  parameters: SchemaParameterDefinition[];
}

export interface SchemaParseMessages {
  invalidEntry: string;
  unsupportedParameter: (name: string, definitionId: string) => { message: string; hint: string };
  duplicateParameter: (name: string) => { message: string; hint: string };
  missingRequired: (names: string[], definitionId: string) => { message: string; hint: string };
  invalidBoolean: (name: string) => { message: string; hint: string };
  invalidNumber: (name: string) => { message: string; hint: string };
  invalidInteger: (name: string) => { message: string; hint: string };
  invalidJson: (name: string, expectedType: 'array' | 'object') => { message: string; hint: string };
  invalidEnum: (name: string, examples: string[]) => { message: string; hint: string };
}

const BOOLEAN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

export function mergeSchemaParamEntries(positionalEntries: string[], optionEntries: string[] = []): string[] {
  return [...positionalEntries, ...optionEntries];
}

export function parseSchemaParams(
  entries: string[],
  definition: SchemaContainerDefinition,
  messages: SchemaParseMessages
): Record<string, unknown> {
  const supported = new Map(definition.parameters.map((parameter) => [parameter.name, parameter]));
  const params: Record<string, unknown> = {};

  for (const entry of entries) {
    const { key, value } = splitEntry(entry, messages.invalidEntry);
    const parameter = supported.get(key);

    if (!parameter) {
      const error = messages.unsupportedParameter(key, definition.id);
      throw new ValidationError(error.message, error.hint);
    }

    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const error = messages.duplicateParameter(key);
      throw new ValidationError(error.message, error.hint);
    }

    params[key] = coerceSchemaParamValue(value, parameter, messages);
  }

  const missing = definition.parameters.filter((parameter) => parameter.required && !(parameter.name in params));

  if (missing.length > 0) {
    const error = messages.missingRequired(
      missing.map((parameter) => parameter.name),
      definition.id
    );
    throw new ValidationError(error.message, error.hint);
  }

  return params;
}

function splitEntry(entry: string, invalidEntryHint: string): { key: string; value: string } {
  const separatorIndex = entry.indexOf('=');

  if (separatorIndex <= 0) {
    throw new ValidationError(`Invalid parameter entry: ${entry}.`, invalidEntryHint);
  }

  const key = entry.slice(0, separatorIndex).trim();
  const value = entry.slice(separatorIndex + 1);

  if (!key) {
    throw new ValidationError(`Invalid parameter entry: ${entry}.`, invalidEntryHint);
  }

  return { key, value };
}

function coerceSchemaParamValue(
  value: string,
  definition: SchemaParameterDefinition,
  messages: SchemaParseMessages
): unknown {
  switch (definition.type) {
    case 'boolean':
      return parseBoolean(value, definition.name, messages);
    case 'number':
      return parseNumber(value, definition, messages);
    case 'integer':
      return parseInteger(value, definition, messages);
    case 'array':
      return parseStructuredJson(value, definition.name, 'array', messages);
    case 'object':
      return parseStructuredJson(value, definition.name, 'object', messages);
    default:
      return validateEnum(value, definition, messages);
  }
}

function parseBoolean(value: string, name: string, messages: SchemaParseMessages): boolean {
  const normalized = value.trim().toLowerCase();

  if (BOOLEAN_TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (BOOLEAN_FALSE_VALUES.has(normalized)) {
    return false;
  }

  const error = messages.invalidBoolean(name);
  throw new ValidationError(error.message, error.hint);
}

function parseNumber(
  value: string,
  definition: SchemaParameterDefinition,
  messages: SchemaParseMessages
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    const error = messages.invalidNumber(definition.name);
    throw new ValidationError(error.message, error.hint);
  }

  return validateEnum(parsed, definition, messages) as number;
}

function parseInteger(
  value: string,
  definition: SchemaParameterDefinition,
  messages: SchemaParseMessages
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    const error = messages.invalidInteger(definition.name);
    throw new ValidationError(error.message, error.hint);
  }

  return validateEnum(parsed, definition, messages) as number;
}

function parseStructuredJson(
  value: string,
  name: string,
  expectedType: 'array' | 'object',
  messages: SchemaParseMessages
): unknown {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (expectedType === 'array' && Array.isArray(parsed)) {
      return parsed;
    }

    if (expectedType === 'object' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    const detail = messages.invalidJson(name, expectedType);
    throw new ValidationError(detail.message, detail.hint, error);
  }

  const detail = messages.invalidJson(name, expectedType);
  throw new ValidationError(detail.message, detail.hint);
}

function validateEnum(
  value: unknown,
  definition: SchemaParameterDefinition,
  messages: SchemaParseMessages
): unknown {
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
    .map((item) => String(item));

  const error = messages.invalidEnum(definition.name, examples);
  throw new ValidationError(error.message, error.hint);
}
