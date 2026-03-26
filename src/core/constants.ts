import type { RuntimeConfig } from '../types/config';

export const DEFAULT_API_BASE_URL = 'https://run.xcrawl.com';
export const ACCOUNT_API_BASE_URL = 'https://api.xcrawl.com';
export const DASHBOARD_BASE_URL = 'https://dash.xcrawl.com';
export const WEB_APP_BASE_URL = 'https://www.xcrawl.com';
export const CLI_AUTH_SOURCE = 'coding-agent';
export const CLI_AUTH_POLL_INTERVAL_MS = 3000;
export const CLI_AUTH_MAX_POLLS = 60;

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  defaultFormat: 'markdown',
  outputDir: '.xcrawl',
  timeoutMs: 30000,
  debug: false
};
