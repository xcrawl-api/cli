import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import { runCli } from '../../src/index';
import type { ApiRequestOptions } from '../../src/types/api';
import type { RuntimeConfig } from '../../src/types/config';

interface MockApi {
  get?: (path: string, options?: ApiRequestOptions) => Promise<unknown>;
  post?: (path: string, options?: ApiRequestOptions) => Promise<unknown>;
}

export interface RunCliResult {
  code: number;
  stdout: string;
  stderr: string;
  homeDir: string;
}

export async function runCliWithMocks(
  argv: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    api?: MockApi;
    onCreateApiClient?: (config: RuntimeConfig) => void;
    version?: string;
    homeDir?: string;
    stdinText?: string;
    isInteractive?: boolean;
    openExternalUrl?: (url: string) => Promise<void>;
    sleep?: (ms: number) => Promise<void>;
  } = {}
): Promise<RunCliResult> {
  const stdinStream = new PassThrough();
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();

  let stdout = '';
  let stderr = '';

  setImmediate(() => {
    stdinStream.end(options.stdinText ?? '');
  });

  stdoutStream.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });

  stderrStream.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });

  const homeDir = options.homeDir ?? (await mkdtemp(path.join(os.tmpdir(), 'xcrawl-cli-test-')));

  const code = await runCli(argv, {
    stdin: stdinStream,
    stdout: stdoutStream,
    stderr: stderrStream,
    env: options.env ?? {},
    homeDir,
    cwd: homeDir,
    isInteractive: options.isInteractive ?? false,
    version: options.version ?? '0.1.0-test',
    openExternalUrl: options.openExternalUrl ?? (async () => {}),
    sleep: options.sleep ?? (async () => {}),
    createApiClient: (config) => {
      options.onCreateApiClient?.(config);
      return {
      get: async <T>(requestPath: string, requestOptions?: ApiRequestOptions) => {
        if (!options.api?.get) {
          throw new Error(`GET mock not configured: ${requestPath}`);
        }
        return options.api.get(requestPath, requestOptions) as Promise<T>;
      },
      post: async <T>(requestPath: string, requestOptions?: ApiRequestOptions) => {
        if (!options.api?.post) {
          throw new Error(`POST mock not configured: ${requestPath}`);
        }
        return options.api.post(requestPath, requestOptions) as Promise<T>;
      }
    };
    }
  });

  stdoutStream.end();
  stderrStream.end();

  return {
    code,
    stdout,
    stderr,
    homeDir
  };
}
