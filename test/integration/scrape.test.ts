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
          const body = options?.body as { url: string };
          return {
            url: body.url,
            format: 'markdown',
            content: `content ${body.url}`
          };
        }
      }
    });

    expect(result.code).toBe(0);
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
        post: async (_requestPath, options) => {
          const body = options?.body as { url: string };
          return {
            url: body.url,
            data: {
              markdown: `content ${body.url}`,
              metadata: { status: 200 }
            }
          };
        }
      }
    });

    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout) as Array<{ url: string }>;
    expect(parsed.length).toBe(2);
    expect(parsed[0].url).toContain('a.com');
    expect(parsed[1].url).toContain('b.com');
  });
});
