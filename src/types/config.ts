export type OutputFormat = 'markdown' | 'json' | 'html' | 'screenshot' | 'text';

export interface XCrawlConfig {
  apiKey?: string;
  apiBaseUrl?: string;
  defaultFormat?: OutputFormat;
  outputDir?: string;
  timeoutMs?: number;
  debug?: boolean;
}

export interface RuntimeConfig {
  apiKey?: string;
  apiBaseUrl: string;
  defaultFormat: OutputFormat;
  outputDir: string;
  timeoutMs: number;
  debug: boolean;
}

export type ConfigField = keyof XCrawlConfig;

export type ConfigKey =
  | 'api-key'
  | 'api-base-url'
  | 'default-format'
  | 'output-dir'
  | 'timeout-ms'
  | 'debug';
