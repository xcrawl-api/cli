import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('init command', () => {
  it('supports non-interactive browser authentication', async () => {
    const observedBodies: unknown[] = [];
    let openedUrl = '';

    const result = await runCliWithMocks(['init', '-y', '--browser'], {
      openExternalUrl: async (url) => {
        openedUrl = url;
      },
      api: {
        post: async (_path, options) => {
          observedBodies.push(options?.body);

          return observedBodies.length === 1
            ? { code: '543' }
            : {
                code: '200',
                data: {
                  api_key: 'xc-init-browser-key'
                }
              };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Opening browser for XCrawl authentication');
    expect(result.stdout).toContain('Authentication complete.');
    expect(result.stdout).toContain('API key saved to:');
    expect(result.stdout).toContain('Next steps:');
    expect(observedBodies).toHaveLength(2);

    const authUrl = new URL(openedUrl);
    expect(authUrl.origin).toBe('https://dash.xcrawl.com');
    expect(authUrl.pathname).toBe('/cli-auth');
    expect(authUrl.searchParams.get('source')).toBe('coding-agent');
    expect(authUrl.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authUrl.searchParams.get('session_id')).toMatch(/^[a-f0-9]{64}$/);
    expect(authUrl.hash).toBe('');

    const [firstRequest] = observedBodies as Array<{ session_id: string; code_verifier: string }>;
    expect(firstRequest.session_id).toMatch(/^[a-f0-9]{64}$/);
    expect(firstRequest.code_verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const configPath = path.join(result.homeDir, '.xcrawl', 'config.json');
    const content = await readFile(configPath, 'utf8');
    expect(content).toContain('xc-init-browser-key');
  });

  it('fails when non-interactive init does not specify an auth method', async () => {
    const result = await runCliWithMocks(['init', '-y']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('xcrawl init -y --browser');
  });

  it('stops polling after 60 pending browser auth checks', async () => {
    let pollCount = 0;

    const result = await runCliWithMocks(['init', '-y', '--browser'], {
      api: {
        post: async () => {
          pollCount += 1;
          return { code: '543' };
        }
      }
    });

    expect(result.code).toBe(1);
    expect(pollCount).toBe(60);
    expect(result.stderr).toContain('[AUTH_ERROR]');
    expect(result.stderr).toContain('timed out after 60 polling attempts');
  });
});
