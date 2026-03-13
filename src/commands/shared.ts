import path from 'node:path';
import type { CliContext } from '../types/cli';
import type { RuntimeConfig, XCrawlConfig } from '../types/config';
import { ApiError } from '../core/errors';
import { readLocalConfig, resolveRuntimeConfig } from '../core/config';
import { readEnvConfig } from '../core/env';

export interface CommonCommandOptions {
  apiKey?: string;
  apiBaseUrl?: string;
  timeout?: number;
  debug?: boolean;
  json?: boolean;
  output?: string;
}

export async function resolveCommandRuntimeConfig(
  context: CliContext,
  flags: XCrawlConfig = {}
): Promise<RuntimeConfig> {
  const localConfig = await readLocalConfig(context.homeDir);
  const envConfig = readEnvConfig(context.env);

  return resolveRuntimeConfig({
    flags,
    env: envConfig,
    local: localConfig
  });
}

export function resolveOutputPath(context: CliContext, outputPath: string | undefined): string | undefined {
  if (!outputPath) {
    return undefined;
  }

  return path.isAbsolute(outputPath) ? outputPath : path.resolve(context.cwd, outputPath);
}

export function isRunApiBaseUrl(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname === 'run.xcrawl.com';
  } catch {
    return false;
  }
}

export function isAccountEndpointUnavailable(error: unknown, baseUrl: string): boolean {
  return isRunApiBaseUrl(baseUrl) && error instanceof ApiError && error.status === 404;
}
