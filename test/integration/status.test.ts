import { describe, expect, it } from 'vitest';

import { ApiError } from '../../src/core/errors';
import { runCliWithMocks } from '../fixtures/cli';

describe('status command', () => {
  it('returns user profile and credit overview on success', async () => {
    const result = await runCliWithMocks(['status'], {
      env: { XCRAWL_API_KEY: 'env-key' },
      api: {
        get: async () => ({
          code: 200,
          msg: 'SUCCESS',
          data: {
            username: 'john_doe',
            email: 'john@example.com',
            created_at: '2024-01-15 10:30:00',
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
    expect(result.stdout).toContain('Username: john_doe');
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
            username: 'john_doe',
            email: 'john@example.com',
            created_at: '2024-01-15 10:30:00',
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
    const parsed = JSON.parse(result.stdout) as { packageTitle: string | null; creditLevel: number };
    expect(parsed.packageTitle).toBeNull();
    expect(parsed.creditLevel).toBe(0);
  });

  it('treats removed whoami command as unknown command', async () => {
    const result = await runCliWithMocks(['whoami']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown command');
  });
});
