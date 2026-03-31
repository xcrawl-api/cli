import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ApiError } from '../../src/core/errors';
import { runCliWithMocks } from '../fixtures/cli';

describe('status command', () => {
  it('always uses the account API domain', async () => {
    let observedBaseUrl = '';
    let observedAppKey = '';

    const result = await runCliWithMocks(['status', '--api-key', 'flag-key'], {
      env: { XCRAWL_API_BASE_URL: 'https://run.xcrawl.com' },
      onCreateApiClient: (config) => {
        observedBaseUrl = config.apiBaseUrl;
      },
      api: {
        get: async (_path, options) => {
          observedAppKey = String(options?.query?.app_key ?? '');
          return {
            code: 200,
            msg: 'SUCCESS',
            data: {
              remain_credits: 100
            }
          };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(observedBaseUrl).toBe('https://api.xcrawl.com');
    expect(observedAppKey).toBe('flag-key');
  });

  it('returns user profile and credit overview on success', async () => {
    const result = await runCliWithMocks(['status'], {
      env: { XCRAWL_API_KEY: 'env-key' },
      api: {
        get: async () => ({
          code: 200,
          msg: 'SUCCESS',
          data: {
            credit_level: 2,
            total_credits: 10000,
            remain_credits: 6500,
            consumed_credits: 3500,
            today_credits: 120,
            next_reset_at: '2026-04-01 00:00:00',
            expired_at: '2026-12-31 23:59:59',
            package_title: 'Pro Plan'
          }
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('XCrawl cli v0.1.0-test');
    expect(result.stdout).not.toContain('Username:');
    expect(result.stdout).not.toContain('Email:');
    expect(result.stdout).not.toContain('Created At:');
    expect(result.stdout).toContain('Remaining Credits: 6500');
    expect(result.stdout).toContain('Package: Pro Plan');
  });

  it('returns actionable error when api key is missing', async () => {
    const result = await runCliWithMocks(['status']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[AUTH_ERROR]');
    expect(result.stderr).toContain('xcrawl login --api-key');
  });

  it('fails when timeout is invalid', async () => {
    const result = await runCliWithMocks(['status', '--api-key', 'flag-key', '--timeout', '0']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('timeout');
  });

  it('returns api error on backend failure', async () => {
    const result = await runCliWithMocks(['status', '--api-key', 'flag-key'], {
      api: {
        get: async () => {
          throw new ApiError('invalid key', 'Please update your API key.', 401);
        }
      }
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[API_ERROR]');
    expect(result.stderr).toContain('invalid key');
  });

  it('supports json output', async () => {
    const result = await runCliWithMocks(['status', '--api-key', 'flag-key', '--json'], {
      api: {
        get: async () => ({
          code: 200,
          msg: 'SUCCESS',
          data: {
            credit_level: 0,
            total_credits: 0,
            remain_credits: 0,
            consumed_credits: 0,
            today_credits: 0,
            next_reset_at: null,
            expired_at: null,
            package_title: null
          }
        })
      }
    });

    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout) as { packageTitle: string | null; creditLevel: number; cliVersion: string };
    expect(parsed.packageTitle).toBeNull();
    expect(parsed.creditLevel).toBe(0);
    expect(parsed.cliVersion).toBe('0.1.0-test');
  });

  it('prompts for browser authentication and keeps json output clean when api key is missing', async () => {
    const result = await runCliWithMocks(['status', '--json'], {
      isInteractive: true,
      stdinText: '1\n',
      api: {
        post: async () => ({
          code: '200',
          data: {
            api_key: 'xc-status-browser-key'
          }
        }),
        get: async () => ({
          code: 200,
          msg: 'SUCCESS',
          data: {
            credit_level: 1,
            total_credits: 100,
            remain_credits: 50,
            consumed_credits: 50,
            today_credits: 10,
            next_reset_at: null,
            expired_at: null,
            package_title: 'Starter'
          }
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stderr).toContain('Welcome! To get started, authenticate with your XCrawl account.');
    expect(() => JSON.parse(result.stdout)).not.toThrow();

    const parsed = JSON.parse(result.stdout) as { cliVersion: string };
    expect(parsed.cliVersion).toBe('0.1.0-test');

    const configPath = path.join(result.homeDir, '.xcrawl', 'config.json');
    const content = await readFile(configPath, 'utf8');
    expect(content).toContain('xc-status-browser-key');
  });

  it('treats removed whoami command as unknown command', async () => {
    const result = await runCliWithMocks(['whoami']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown command');
  });
});
