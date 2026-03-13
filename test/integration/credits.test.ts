import { describe, expect, it } from 'vitest';

import { ApiError } from '../../src/core/errors';
import { runCliWithMocks } from '../fixtures/cli';

describe('credits command', () => {
  it('returns credits data', async () => {
    const result = await runCliWithMocks(['credits', '--api-key', 'flag-key'], {
      api: {
        get: async () => ({
          remaining: 90,
          used: 10,
          total: 100
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Remaining: 90');
  });

  it('returns actionable error when api key is missing', async () => {
    const result = await runCliWithMocks(['credits']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[AUTH_ERROR]');
  });

  it('fails when timeout is invalid', async () => {
    const result = await runCliWithMocks(['credits', '--api-key', 'flag-key', '--timeout', '-10']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
  });

  it('falls back gracefully when account endpoint is unavailable on run API', async () => {
    const result = await runCliWithMocks(['credits', '--api-key', 'flag-key', '--json'], {
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
