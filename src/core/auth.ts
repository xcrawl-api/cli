import { createHash, randomBytes } from 'node:crypto';

import { fetchCliAuthStatus } from '../api/auth';
import type { CliContext } from '../types/cli';
import {
  CLI_AUTH_MAX_POLLS,
  CLI_AUTH_POLL_INTERVAL_MS,
  CLI_AUTH_SOURCE,
  DASHBOARD_BASE_URL,
  DEFAULT_RUNTIME_CONFIG,
  WEB_APP_BASE_URL
} from './constants';
import { saveLocalConfig } from './config';
import { AuthError, ValidationError } from './errors';
import { promptLine } from './prompts';

export interface AuthSuccessResult {
  apiKey: string;
  configPath: string;
  method: 'api-key' | 'browser';
}

export interface BrowserAuthSession {
  sessionId: string;
  codeVerifier: string;
  codeChallenge: string;
  authUrl: string;
}

export interface EnsureApiKeyOptions {
  output: NodeJS.WritableStream;
}

function encodeBase64Url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function generateBrowserAuthSession(): BrowserAuthSession {
  const sessionId = randomBytes(32).toString('hex');
  const codeVerifier = encodeBase64Url(randomBytes(32)).slice(0, 43);
  const codeChallenge = encodeBase64Url(createHash('sha256').update(codeVerifier).digest());
  const authUrl = new URL('/cli-auth', DASHBOARD_BASE_URL);

  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('source', CLI_AUTH_SOURCE);
  authUrl.searchParams.set('session_id', sessionId);

  return {
    sessionId,
    codeVerifier,
    codeChallenge,
    authUrl: authUrl.toString()
  };
}

function getMissingApiKeyError(): AuthError {
  return new AuthError(
    'Missing API key.',
    'Run `xcrawl login --browser`, `xcrawl login --api-key <key>`, or set `XCRAWL_API_KEY`.'
  );
}

export function requireApiKey(apiKey: string | undefined): string {
  if (apiKey && apiKey.trim().length > 0) {
    return apiKey;
  }

  throw getMissingApiKeyError();
}

export async function saveApiKey(apiKey: string, homeDir: string): Promise<string> {
  if (apiKey.trim().length === 0) {
    throw new ValidationError('Missing required API key.', 'Provide a non-empty XCrawl API key.');
  }

  return saveLocalConfig({ apiKey }, homeDir);
}

export async function loginWithApiKey(apiKey: string, homeDir: string): Promise<AuthSuccessResult> {
  const configPath = await saveApiKey(apiKey, homeDir);

  return {
    apiKey,
    configPath,
    method: 'api-key'
  };
}

export function formatAuthGettingStarted(): string {
  return [
    'Next steps:',
    '  xcrawl https://example.com',
    '  xcrawl search "xcrawl cli"',
    '  xcrawl status',
    '  xcrawl --help'
  ].join('\n');
}

async function openBrowserOrPrintUrl(context: CliContext, output: NodeJS.WritableStream, authUrl: string): Promise<void> {
  output.write('Opening browser for XCrawl authentication...\n');

  try {
    await context.openExternalUrl(authUrl);
  } catch {
    output.write('Browser launch was not available.\n');
  }

  output.write(`If the browser does not open, visit:\n${authUrl}\n\n`);
}

interface BrowserAuthCancellation {
  cleanup: () => void;
  waitForCancellation: Promise<never>;
}

function createBrowserAuthCancellation(context: CliContext): BrowserAuthCancellation {
  let canceled = false;
  let rejectCancellation: ((reason?: unknown) => void) | undefined;
  const waitForCancellation = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject;
  });

  const cancel = (): void => {
    if (canceled) {
      return;
    }

    canceled = true;
    rejectCancellation?.(
      new AuthError(
        'Browser authentication was canceled by the user.',
        'Run `xcrawl login --browser` to start a new browser authentication session.'
      )
    );
  };

  const onSigint = (): void => cancel();
  const onSigterm = (): void => cancel();
  const onStdinClose = (): void => cancel();

  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  if (context.isInteractive) {
    context.stdin.once('close', onStdinClose);
    context.stdin.once('end', onStdinClose);
  }

  return {
    cleanup: () => {
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);

      if (context.isInteractive) {
        context.stdin.off('close', onStdinClose);
        context.stdin.off('end', onStdinClose);
      }
    },
    waitForCancellation
  };
}

export async function loginWithBrowser(context: CliContext, output: NodeJS.WritableStream): Promise<AuthSuccessResult> {
  const session = generateBrowserAuthSession();
  const client = context.createApiClient({
    ...DEFAULT_RUNTIME_CONFIG,
    apiBaseUrl: WEB_APP_BASE_URL
  });
  const cancellation = createBrowserAuthCancellation(context);

  try {
    await openBrowserOrPrintUrl(context, output, session.authUrl);
    output.write('Waiting for browser authorization...\n');

    for (let attempt = 1; attempt <= CLI_AUTH_MAX_POLLS; attempt += 1) {
      const status = await Promise.race([
        fetchCliAuthStatus(client, session.sessionId, session.codeVerifier),
        cancellation.waitForCancellation
      ]);

      if (status.status === 'authorized' && status.apiKey) {
        const configPath = await saveApiKey(status.apiKey, context.homeDir);
        output.write('Authentication complete.\n');

        return {
          apiKey: status.apiKey,
          configPath,
          method: 'browser'
        };
      }

      if (attempt < CLI_AUTH_MAX_POLLS) {
        await Promise.race([context.sleep(CLI_AUTH_POLL_INTERVAL_MS), cancellation.waitForCancellation]);
      }
    }
  } finally {
    cancellation.cleanup();
  }

  throw new AuthError(
    `Browser authentication timed out after ${CLI_AUTH_MAX_POLLS} polling attempts.`,
    'Retry `xcrawl login --browser`, or enter the API key manually.'
  );
}

async function promptForApiKey(context: CliContext, output: NodeJS.WritableStream): Promise<AuthSuccessResult> {
  const apiKey = await promptLine(context.stdin, output, 'Enter API key: ');
  return loginWithApiKey(apiKey, context.homeDir);
}

export async function promptForAuthentication(context: CliContext, output: NodeJS.WritableStream): Promise<AuthSuccessResult> {
  if (!context.isInteractive) {
    throw getMissingApiKeyError();
  }

  while (true) {
    const choice = await promptLine(
      context.stdin,
      output,
      [
        'XCrawl CLI',
        'Turn websites into LLM-ready data',
        '',
        'Welcome! To get started, authenticate with your XCrawl account.',
        '',
        '1. Login with browser (recommended)',
        '2. Enter API key manually',
        '',
        'Tip: You can also set XCRAWL_API_KEY environment variable',
        '',
        'Enter choice [1/2]: '
      ].join('\n')
    );

    if (choice === '1') {
      return loginWithBrowser(context, output);
    }

    if (choice === '2') {
      return promptForApiKey(context, output);
    }

    output.write('Please enter 1 or 2.\n\n');
  }
}

export async function ensureApiKey(
  context: CliContext,
  apiKey: string | undefined,
  options: EnsureApiKeyOptions
): Promise<string> {
  if (apiKey && apiKey.trim().length > 0) {
    return apiKey;
  }

  const result = await promptForAuthentication(context, options.output);
  return result.apiKey;
}
