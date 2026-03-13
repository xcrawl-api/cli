import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import { runCli } from '../../src/index';
import type { ApiRequestOptions } from '../../src/types/api';

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
    version?: string;
    homeDir?: string;
  } = {}
): Promise<RunCliResult> {
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();

  let stdout = '';
  let stderr = '';

  stdoutStream.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });

  stderrStream.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });

  const homeDir = options.homeDir ?? (await mkdtemp(path.join(os.tmpdir(), 'xcrawl-cli-test-')));

  const code = await runCli(argv, {
    stdout: stdoutStream,
    stderr: stderrStream,
    env: options.env ?? {},
    homeDir,
    cwd: homeDir,
    version: options.version ?? '0.1.0-test',
    createApiClient: () => ({
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
    })
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
