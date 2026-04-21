#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command, CommanderError } from 'commander';

import { ApiClient } from './api/client';
import { promptForAuthentication } from './core/auth';
import { readLocalConfig, resolveRuntimeConfig } from './core/config';
import { registerConfigCommand } from './commands/config';
import { registerCrawlCommand } from './commands/crawl';
import { registerInitCommand } from './commands/init';
import { registerLoginCommand } from './commands/login';
import { registerLogoutCommand } from './commands/logout';
import { registerMapCommand } from './commands/map';
import { registerSerpCommand } from './commands/serp';
import { registerScrapeCommand } from './commands/scrape';
import { registerSearchCommand } from './commands/search';
import { registerStatusCommand } from './commands/status';
import { formatErrorForUser } from './core/errors';
import { readEnvConfig } from './core/env';
import type { CliContext } from './types/cli';
import type { RuntimeConfig } from './types/config';

const KNOWN_COMMANDS = new Set([
  'login',
  'logout',
  'status',
  'scrape',
  'search',
  'serp',
  'map',
  'crawl',
  'config',
  'init',
  'help'
]);

function isLikelyHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function normalizeArgv(argv: string[]): string[] {
  if (argv.length === 0) {
    return argv;
  }

  if (argv[0] === 'crawl' && argv.length > 1) {
    const second = argv[1];
    if (!second.startsWith('-') && second !== 'start' && second !== 'status' && second !== 'help') {
      return ['crawl', 'start', ...argv.slice(1)];
    }
  }

  const [first] = argv;
  if (first.startsWith('-') || KNOWN_COMMANDS.has(first)) {
    return argv;
  }

  if (!isLikelyHttpUrl(first)) {
    return argv;
  }

  return ['scrape', ...argv];
}

function openExternalUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command =
      process.platform === 'darwin'
        ? ['open', url]
        : process.platform === 'win32'
          ? ['cmd', '/c', 'start', '', url]
          : ['xdg-open', url];

    const child = spawn(command[0], command.slice(1), {
      detached: process.platform !== 'win32',
      stdio: 'ignore'
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

function resolveCliVersion(env: NodeJS.ProcessEnv): string {
  const envVersion = env.npm_package_version;
  if (typeof envVersion === 'string' && envVersion.trim().length > 0) {
    return envVersion;
  }

  try {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: unknown };

    if (typeof packageJson.version === 'string' && packageJson.version.trim().length > 0) {
      return packageJson.version;
    }
  } catch {
    // Fall back to a safe default if package metadata cannot be read.
  }

  return '0.1.0';
}

export function createDefaultContext(overrides: Partial<CliContext> = {}): CliContext {
  const env = overrides.env ?? process.env;

  return {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    env,
    cwd: process.cwd(),
    homeDir: os.homedir(),
    isInteractive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    now: () => new Date(),
    version: overrides.version ?? resolveCliVersion(env),
    openExternalUrl,
    sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    createApiClient: (config: RuntimeConfig) =>
      new ApiClient({
        baseUrl: config.apiBaseUrl,
        apiKey: config.apiKey,
        timeoutMs: config.timeoutMs,
        debug: config.debug
      }),
    ...overrides
  };
}

export function createProgram(context: CliContext): Command {
  const program = new Command();

  program.name('xcrawl').description('XCrawl CLI').version(context.version);

  registerLoginCommand(program, context);
  registerLogoutCommand(program, context);
  registerStatusCommand(program, context);
  registerScrapeCommand(program, context);
  registerSearchCommand(program, context);
  registerSerpCommand(program, context);

  registerMapCommand(program, context);
  registerCrawlCommand(program, context);
  registerConfigCommand(program, context);
  registerInitCommand(program, context);

  program.showHelpAfterError('(Use --help to view command usage)');
  program.exitOverride();

  return program;
}

export async function runCli(argv: string[], contextOverrides: Partial<CliContext> = {}): Promise<number> {
  const context = createDefaultContext(contextOverrides);
  const program = createProgram(context);

  try {
    const normalizedArgv = normalizeArgv(argv);

    if (normalizedArgv.length === 0) {
      const runtime = resolveRuntimeConfig({
        env: readEnvConfig(context.env),
        local: await readLocalConfig(context.homeDir)
      });

      if (runtime.apiKey) {
        context.stdout.write(program.helpInformation());
        return 0;
      }

      await promptForAuthentication(context, context.stdout);
      return 0;
    }

    await program.parseAsync(normalizedArgv, { from: 'user' });
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code !== 'commander.helpDisplayed') {
        context.stderr.write(`${error.message}\n`);
      }
      return error.exitCode;
    }

    context.stderr.write(`${formatErrorForUser(error)}\n`);
    return 1;
  }
}

async function main(): Promise<void> {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

if (require.main === module) {
  void main();
}

export const projectRoot = path.resolve(__dirname, '..');
