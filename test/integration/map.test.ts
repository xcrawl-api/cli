import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('map command', () => {
  it('returns mapped links on success', async () => {
    const result = await runCliWithMocks(['map', 'https://example.com', '--limit', '2'], {
      env: { XCRAWL_API_KEY: 'env-key' },
      api: {
        post: async () => ({
          url: 'https://example.com',
          data: {
            total_links: 2,
            links: [
              'https://example.com/a',
              'https://example.com/b'
            ]
          }
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Source URL: https://example.com');
    expect(result.stdout).toContain('Total links: 2');
    expect(result.stdout).toContain('1. https://example.com/a');
    expect(result.stdout).toContain('2. https://example.com/b');
    expect(result.stdout).not.toContain('Untitled');
  });

  it('returns actionable error when api key is missing', async () => {
    const result = await runCliWithMocks(['map', 'https://example.com']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[AUTH_ERROR]');
  });

  it('fails with invalid url', async () => {
    const result = await runCliWithMocks(['map', 'not-a-url', '--api-key', 'flag-key']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
  });
});
