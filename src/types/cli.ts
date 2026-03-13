import type { ApiTransport } from './api';
import type { RuntimeConfig } from './config';

export interface CliContext {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string;
  now: () => Date;
  version: string;
  createApiClient: (config: RuntimeConfig) => ApiTransport;
}
