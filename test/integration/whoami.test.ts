import { describe, expect, it } from 'vitest';

import { ApiError } from '../../src/core/errors';
import { runCliWithMocks } from '../fixtures/cli';

describe('whoami command', () => {
  it('returns account info on success', async () => {
    const result = await runCliWithMocks(['whoami'], {
      env: { XCRAWL_API_KEY: 'env-key' },
      api: {
        get: async () => ({
          id: 'u_1',
          email: 'user@example.com',
          name: 'Test User',
          plan: 'pro'
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('user@example.com');
  });

  it('returns actionable error when api key is missing', async () => {
    const result = await runCliWithMocks(['whoami']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[AUTH_ERROR]');
    expect(result.stderr).toContain('xcrawl login --api-key');
  });

  it('fails when timeout is invalid', async () => {
    const result = await runCliWithMocks(['whoami', '--api-key', 'flag-key', '--timeout', '0']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('timeout');
  });

  it('returns api error on backend failure', async () => {
    const result = await runCliWithMocks(['whoami', '--api-key', 'flag-key'], {
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

  it('falls back gracefully when account endpoint is unavailable on run API', async () => {
    const result = await runCliWithMocks(['whoami', '--api-key', 'flag-key', '--json'], {
      api: {
        get: async () => {
          throw new ApiError('not found', 'not found', 404);
        }
      }
    });

    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout) as { supported: boolean };
    expect(parsed.supported).toBe(false);
  });
});
