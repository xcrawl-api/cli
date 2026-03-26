import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('login command', () => {
  it('saves api key successfully', async () => {
    const result = await runCliWithMocks(['login', '--api-key', 'test-key']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('API key saved');

    const configPath = path.join(result.homeDir, '.xcrawl', 'config.json');
    const content = await readFile(configPath, 'utf8');
    expect(content).toContain('test-key');
  });

  it('returns actionable auth error in non-interactive mode when no auth method is provided', async () => {
    const result = await runCliWithMocks(['login']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[AUTH_ERROR]');
    expect(result.stderr).toContain('xcrawl login --browser');
  });

  it('supports json output', async () => {
    const result = await runCliWithMocks(['login', '--api-key', 'test-key', '--json']);

    expect(result.code).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it('supports browser authentication with json output', async () => {
    let openedUrl = '';

    const result = await runCliWithMocks(['login', '--browser', '--json'], {
      openExternalUrl: async (url) => {
        openedUrl = url;
      },
      api: {
        post: async () => ({
          code: '200',
          data: {
            api_key: 'xc-browser-key'
          }
        })
      }
    });

    expect(result.code).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stderr).toContain('Opening browser for XCrawl authentication');
    expect(openedUrl).toContain('https://dash.xcrawl.com/cli-auth?');

    const configPath = path.join(result.homeDir, '.xcrawl', 'config.json');
    const content = await readFile(configPath, 'utf8');
    expect(content).toContain('xc-browser-key');
  });

  it('stops browser polling when the user cancels the session', async () => {
    let sleepCalls = 0;

    const result = await runCliWithMocks(['login', '--browser'], {
      api: {
        post: async () => ({ code: '543' })
      },
      sleep: async () => {
        sleepCalls += 1;
        process.emit('SIGINT', 'SIGINT');
      }
    });

    expect(result.code).toBe(1);
    expect(sleepCalls).toBe(1);
    expect(result.stderr).toContain('[AUTH_ERROR]');
    expect(result.stderr).toContain('Browser authentication was canceled by the user');
  });
});
