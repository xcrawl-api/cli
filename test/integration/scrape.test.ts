import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('scrape command', () => {
  it('supports default command behavior: xcrawl <url>', async () => {
    const result = await runCliWithMocks(['https://example.com'], {
      env: { XCRAWL_API_KEY: 'env-key' },
      api: {
        post: async () => ({
          url: 'https://example.com',
          format: 'markdown',
          content: '# Example',
          metadata: { status: 200 }
        })
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('URL: https://example.com');
  });

  it('writes batch outputs when scraping multiple urls', async () => {
    const outputDir = 'results';
    const result = await runCliWithMocks(['scrape', 'https://a.com', 'https://b.com', '--output', outputDir], {
      env: { XCRAWL_API_KEY: 'env-key' },
      api: {
        post: async (requestPath, options) => {
          expect(requestPath).toBe('/v1/batch/scrape');
          expect(options?.body).toMatchObject({
            urls: ['https://a.com', 'https://b.com'],
            batch: { max_concurrency: 3, ignore_invalid_urls: false },
            output: { formats: ['markdown'] }
          });
          return {
            batch_scrape_id: 'batch_1',
            status: 'pending'
          };
        },
        get: async (requestPath) => {
          if (requestPath === '/v1/batch/scrape/batch_1') {
            return {
              batch_scrape_id: 'batch_1',
              status: 'completed',
              total_urls: 2,
              completed_urls: 2,
              failed_urls: 0,
              invalid_urls: [],
              data: {
                results: [
                  {
                    url: 'https://a.com',
                    status: 'completed',
                    data: { result_ref: '/v1/scrape/scrape_a', scrape_id: 'scrape_a' }
                  },
                  {
                    url: 'https://b.com',
                    status: 'completed',
                    data: { result_ref: '/v1/scrape/scrape_b', scrape_id: 'scrape_b' }
                  }
                ],
                has_more: false
              }
            };
          }

          if (requestPath === '/v1/scrape/scrape_a') {
            return {
              url: 'https://a.com',
              data: {
                markdown: 'content https://a.com',
                metadata: { status_code: 200 }
              }
            };
          }

          if (requestPath === '/v1/scrape/scrape_b') {
            return {
              url: 'https://b.com',
              data: {
                markdown: 'content https://b.com',
                metadata: { status_code: 200 }
              }
            };
          }

          throw new Error(`Unexpected GET path: ${requestPath}`);
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Batch Scrape ID: batch_1');
    expect(result.stdout).toContain('Completed URLs: 2');
    const files = await readdir(path.join(result.homeDir, outputDir));
    expect(files.length).toBe(2);
    const first = await readFile(path.join(result.homeDir, outputDir, files[0]), 'utf8');
    expect(first).toContain('URL:');
  });

  it('fails with invalid url', async () => {
    const result = await runCliWithMocks(['scrape', 'not-a-url'], {
      env: { XCRAWL_API_KEY: 'env-key' }
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
  });

  it('supports --input and --concurrency for batch scraping', async () => {
    const homeDir = await mkdtemp(path.join(os.tmpdir(), 'xcrawl-cli-scrape-input-'));
    const inputFile = path.join(homeDir, 'urls.txt');
    await writeFile(inputFile, 'https://a.com\nhttps://b.com\n', 'utf8');

    const result = await runCliWithMocks(['scrape', '--input', 'urls.txt', '--concurrency', '2', '--json'], {
      homeDir,
      env: { XCRAWL_API_KEY: 'env-key' },
      api: {
        post: async (requestPath, options) => {
          expect(requestPath).toBe('/v1/batch/scrape');
          expect(options?.body).toMatchObject({
            urls: ['https://a.com', 'https://b.com'],
            batch: { max_concurrency: 2, ignore_invalid_urls: false },
            output: { formats: ['markdown'] }
          });
          return {
            batch_scrape_id: 'batch_json',
            status: 'pending'
          };
        },
        get: async (requestPath) => {
          if (requestPath === '/v1/batch/scrape/batch_json') {
            return {
              batch_scrape_id: 'batch_json',
              status: 'completed',
              total_urls: 2,
              completed_urls: 2,
              failed_urls: 0,
              invalid_urls: [],
              data: {
                results: [
                  {
                    url: 'https://a.com',
                    status: 'completed',
                    data: { result_ref: '/v1/scrape/json_a' }
                  },
                  {
                    url: 'https://b.com',
                    status: 'completed',
                    data: { result_ref: '/v1/scrape/json_b' }
                  }
                ],
                has_more: false
              }
            };
          }

          if (requestPath === '/v1/scrape/json_a') {
            return {
              url: 'https://a.com',
              data: {
                markdown: 'content https://a.com',
                metadata: { status_code: 200 }
              }
            };
          }

          if (requestPath === '/v1/scrape/json_b') {
            return {
              url: 'https://b.com',
              data: {
                markdown: 'content https://b.com',
                metadata: { status_code: 200 }
              }
            };
          }

          throw new Error(`Unexpected GET path: ${requestPath}`);
        }
      }
    });

    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout) as Array<{ url: string }>;
    expect(parsed.length).toBe(2);
    expect(parsed[0].url).toContain('a.com');
    expect(parsed[1].url).toContain('b.com');
  });

  it('fails when a batch scrape job does not finish before the wait timeout', async () => {
    const result = await runCliWithMocks(
      ['scrape', 'https://a.com', 'https://b.com', '--interval', '1', '--wait-timeout', '1'],
      {
        env: { XCRAWL_API_KEY: 'env-key' },
        api: {
          post: async () => ({
            batch_scrape_id: 'batch_wait',
            status: 'pending'
          }),
          get: async (requestPath) => {
            expect(requestPath).toBe('/v1/batch/scrape/batch_wait');
            return {
              batch_scrape_id: 'batch_wait',
              status: 'pending',
              total_urls: 2,
              completed_urls: 0,
              failed_urls: 0,
              invalid_urls: [],
              data: {
                results: [],
                has_more: false
              }
            };
          }
        }
      }
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Batch scrape job did not finish in time');
  });
});
