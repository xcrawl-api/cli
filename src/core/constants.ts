import type { RuntimeConfig } from '../types/config';

export const DEFAULT_API_BASE_URL = 'https://run.xcrawl.com';
export const ACCOUNT_API_BASE_URL = 'https://api.xcrawl.com';

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  defaultFormat: 'markdown',
  outputDir: '.xcrawl',
  timeoutMs: 30000,
  debug: false
};
