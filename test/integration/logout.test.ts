import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('logout command', () => {
  it('clears saved api key and keeps other config values', async () => {
    const loginResult = await runCliWithMocks(['login', '--api-key', 'test-key']);
    const homeDir = loginResult.homeDir;

    const setResult = await runCliWithMocks(['config', 'set', 'api-base-url', 'https://api.example.com'], { homeDir });
    expect(setResult.code).toBe(0);

    const result = await runCliWithMocks(['logout'], { homeDir });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('API key removed');

    const configPath = path.join(homeDir, '.xcrawl', 'config.json');
    const content = JSON.parse(await readFile(configPath, 'utf8')) as { apiKey?: string; apiBaseUrl?: string };
    expect(content.apiKey).toBeUndefined();
    expect(content.apiBaseUrl).toBe('https://api.example.com');
  });

  it('returns success when no local api key exists', async () => {
    const result = await runCliWithMocks(['logout']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No local API key found');
  });

  it('supports json output', async () => {
    const loginResult = await runCliWithMocks(['login', '--api-key', 'test-key']);
    const result = await runCliWithMocks(['logout', '--json'], { homeDir: loginResult.homeDir });

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout) as { ok: boolean; cleared: boolean; configPath: string };
    expect(payload.ok).toBe(true);
    expect(payload.cleared).toBe(true);
    expect(payload.configPath).toContain('.xcrawl/config.json');
  });

  it('fails with actionable error when local config JSON is invalid', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'xcrawl-cli-logout-'));
    const configDir = path.join(tempDir, '.xcrawl');
    const configPath = path.join(configDir, 'config.json');

    await mkdir(configDir, { recursive: true });
    await writeFile(configPath, '{ invalid-json', 'utf8');

    const result = await runCliWithMocks(['logout'], { homeDir: tempDir });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[CONFIG_ERROR]');
    expect(result.stderr).toContain('Please verify the JSON format is valid.');
  });
});
