import type { ApiTransport } from './api';
import type { RuntimeConfig } from './config';

export interface CliContext {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  env: NodeJS.ProcessEnv;
  cwd: string;
  homeDir: string;
  isInteractive: boolean;
  now: () => Date;
  version: string;
  openExternalUrl: (url: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  createApiClient: (config: RuntimeConfig) => ApiTransport;
}
