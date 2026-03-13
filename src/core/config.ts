import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { DEFAULT_RUNTIME_CONFIG } from './constants';
import { ConfigError, ValidationError } from './errors';
import type { ConfigField, ConfigKey, OutputFormat, RuntimeConfig, XCrawlConfig } from '../types/config';

const CONFIG_KEY_TO_FIELD: Record<ConfigKey, ConfigField> = {
  'api-key': 'apiKey',
  'api-base-url': 'apiBaseUrl',
  'default-format': 'defaultFormat',
  'output-dir': 'outputDir',
  'timeout-ms': 'timeoutMs',
  debug: 'debug'
};

const ALLOWED_DEFAULT_FORMATS: ReadonlySet<OutputFormat> = new Set(['markdown', 'json', 'html', 'screenshot', 'text']);

export function getConfigPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.xcrawl', 'config.json');
}

export async function readLocalConfig(homeDir?: string): Promise<XCrawlConfig> {
  const configPath = getConfigPath(homeDir);

  try {
    await access(configPath);
  } catch {
    return {};
  }

  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as XCrawlConfig;
    return parsed;
  } catch (error) {
    throw new ConfigError(`Failed to read config file: ${configPath}`, 'Please verify the JSON format is valid.', error);
  }
}

export async function saveLocalConfig(nextConfig: XCrawlConfig, homeDir?: string): Promise<string> {
  const configPath = getConfigPath(homeDir);
  const configDir = path.dirname(configPath);
  const existing = await readLocalConfig(homeDir);
  const merged = { ...existing, ...nextConfig };

  try {
    await mkdir(configDir, { recursive: true });
    await writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
    return configPath;
  } catch (error) {
    throw new ConfigError(`Failed to write config file: ${configPath}`, 'Please check directory permissions.', error);
  }
}

export interface ResolveRuntimeConfigInput {
  flags?: XCrawlConfig;
  env?: XCrawlConfig;
  local?: XCrawlConfig;
  defaults?: RuntimeConfig;
}

export function resolveRuntimeConfig(input: ResolveRuntimeConfigInput): RuntimeConfig {
  const defaults = input.defaults ?? DEFAULT_RUNTIME_CONFIG;
  const flags = input.flags ?? {};
  const env = input.env ?? {};
  const local = input.local ?? {};

  return {
    apiKey: flags.apiKey ?? env.apiKey ?? local.apiKey,
    apiBaseUrl: flags.apiBaseUrl ?? env.apiBaseUrl ?? local.apiBaseUrl ?? defaults.apiBaseUrl,
    defaultFormat: flags.defaultFormat ?? env.defaultFormat ?? local.defaultFormat ?? defaults.defaultFormat,
    outputDir: flags.outputDir ?? env.outputDir ?? local.outputDir ?? defaults.outputDir,
    timeoutMs: flags.timeoutMs ?? env.timeoutMs ?? local.timeoutMs ?? defaults.timeoutMs,
    debug: flags.debug ?? env.debug ?? local.debug ?? defaults.debug
  };
}

export function isConfigKey(value: string): value is ConfigKey {
  return Object.prototype.hasOwnProperty.call(CONFIG_KEY_TO_FIELD, value);
}

export function resolveConfigField(key: string): ConfigField {
  if (!isConfigKey(key)) {
    throw new ValidationError(
      `Unsupported config key: ${key}`,
      'Use one of: api-key, api-base-url, default-format, output-dir, timeout-ms, debug.'
    );
  }

  return CONFIG_KEY_TO_FIELD[key];
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  throw new ValidationError('Invalid boolean value.', 'Use true/false or 1/0.');
}

function parseDefaultFormat(value: string): OutputFormat {
  if (ALLOWED_DEFAULT_FORMATS.has(value as OutputFormat)) {
    return value as OutputFormat;
  }

  throw new ValidationError(
    `Invalid default format: ${value}`,
    'Use one of: markdown, json, html, screenshot, text.'
  );
}

export function parseConfigValue(field: ConfigField, rawValue: string): XCrawlConfig[ConfigField] {
  switch (field) {
    case 'timeoutMs': {
      const timeoutMs = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new ValidationError('Invalid timeout-ms value.', 'Use a positive integer for timeout-ms.');
      }
      return timeoutMs;
    }
    case 'debug':
      return parseBoolean(rawValue);
    case 'defaultFormat':
      return parseDefaultFormat(rawValue);
    default:
      return rawValue;
  }
}

export async function getConfigValue(key: string, homeDir?: string): Promise<unknown> {
  const field = resolveConfigField(key);
  const config = await readLocalConfig(homeDir);
  return config[field];
}

export async function setConfigValue(
  key: string,
  rawValue: string,
  homeDir?: string
): Promise<{ configPath: string; field: ConfigField; value: unknown }> {
  const field = resolveConfigField(key);
  const value = parseConfigValue(field, rawValue);
  const configPath = await saveLocalConfig({ [field]: value } satisfies Partial<XCrawlConfig>, homeDir);

  return {
    configPath,
    field,
    value
  };
}
