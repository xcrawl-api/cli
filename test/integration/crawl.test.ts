import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('crawl command', () => {
  it('starts crawl job', async () => {
    const result = await runCliWithMocks(['crawl', 'https://example.com', '--api-key', 'flag-key'], {
      api: {
        post: async () => ({
          crawl_id: 'job_1',
          url: 'https://example.com',
          status: 'pending'
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Job ID: job_1');
    expect(result.stdout).toContain('Status: pending');
  });

  it('supports crawl status subcommand', async () => {
    const result = await runCliWithMocks(['crawl', 'status', 'job_1', '--api-key', 'flag-key'], {
      api: {
        get: async () => ({
          crawl_id: 'job_1',
          url: 'https://example.com',
          status: 'crawling',
          data: { data: [{}, {}, {}] }
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Status: crawling');
  });

  it('waits for completion when --wait is set', async () => {
    let statusPollCount = 0;

    const result = await runCliWithMocks(
      ['crawl', 'https://example.com', '--api-key', 'flag-key', '--wait', '--interval', '1', '--wait-timeout', '500'],
      {
        api: {
          post: async () => ({
            crawl_id: 'job_wait',
            url: 'https://example.com',
            status: 'pending'
          }),
          get: async () => {
            statusPollCount += 1;
            if (statusPollCount < 2) {
              return {
                crawl_id: 'job_wait',
                url: 'https://example.com',
                status: 'crawling',
                data: { data: [] }
              };
            }

            return {
              crawl_id: 'job_wait',
              url: 'https://example.com',
              status: 'completed',
              data: { data: Array.from({ length: 10 }) }
            };
          }
        }
      }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Status: completed');
    expect(statusPollCount).toBeGreaterThanOrEqual(2);
  });

  it('fails when url is missing', async () => {
    const result = await runCliWithMocks(['crawl']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
  });
});
