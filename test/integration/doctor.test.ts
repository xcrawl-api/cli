import { describe, expect, it } from 'vitest';

import { ApiError } from '../../src/core/errors';
import { runCliWithMocks } from '../fixtures/cli';

describe('doctor command', () => {
  it('prints doctor checks', async () => {
    const result = await runCliWithMocks(['doctor']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('XCrawl CLI');
    expect(result.stdout).toContain('config_rw');
  });

  it('supports connectivity check when api key exists', async () => {
    const result = await runCliWithMocks(['doctor', '--api-key', 'flag-key'], {
      api: {
        get: async () => ({ id: 'u1', email: 'u@example.com' })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('api_connectivity');
  });

  it('fails when timeout is invalid', async () => {
    const result = await runCliWithMocks(['doctor', '--timeout', '0']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
  });

  it('supports json output', async () => {
    const result = await runCliWithMocks(['doctor', '--json']);

    expect(result.code).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it('treats account endpoint 404 as reachable public API', async () => {
    const result = await runCliWithMocks(['doctor', '--api-key', 'flag-key', '--json'], {
      api: {
        get: async () => {
          throw new ApiError('not found', 'not found', 404);
        }
      }
    });

    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout) as { checks: Array<{ name: string; ok: boolean }> };
    const connectivity = parsed.checks.find((item) => item.name === 'api_connectivity');
    expect(connectivity?.ok).toBe(true);
  });
});
