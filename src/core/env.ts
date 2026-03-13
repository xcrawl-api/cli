import type { XCrawlConfig } from '../types/config';

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readEnvConfig(env: NodeJS.ProcessEnv = process.env): XCrawlConfig {
  return {
    apiKey: env.XCRAWL_API_KEY,
    apiBaseUrl: env.XCRAWL_API_BASE_URL,
    defaultFormat: env.XCRAWL_DEFAULT_FORMAT as XCrawlConfig['defaultFormat'],
    outputDir: env.XCRAWL_OUTPUT_DIR,
    timeoutMs: parseNumber(env.XCRAWL_TIMEOUT_MS),
    debug: parseBoolean(env.XCRAWL_DEBUG)
  };
}
