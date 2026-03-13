import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('search command', () => {
  it('renders search table output', async () => {
    const result = await runCliWithMocks(['search', 'xcrawl', '--api-key', 'flag-key'], {
      api: {
        post: async () => ({
          query: 'xcrawl',
          data: {
            data: [{ title: 'XCrawl', url: 'https://xcrawl.com' }]
          }
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Title');
    expect(result.stdout).toContain('https://xcrawl.com');
  });

  it('supports json output', async () => {
    const result = await runCliWithMocks(['search', 'xcrawl', '--api-key', 'flag-key', '--json'], {
      api: {
        post: async () => ({
          query: 'xcrawl',
          data: { data: [] }
        })
      }
    });

    expect(result.code).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it('fails when limit is invalid', async () => {
    const result = await runCliWithMocks(['search', 'xcrawl', '--api-key', 'flag-key', '--limit', '0']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('limit');
  });
});
