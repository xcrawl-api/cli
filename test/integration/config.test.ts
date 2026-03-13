import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('config command', () => {
  it('sets and gets config values', async () => {
    const homeDir = await mkdtemp(path.join(os.tmpdir(), 'xcrawl-cli-config-'));

    const setResult = await runCliWithMocks(['config', 'set', 'api-base-url', 'https://api.example.com'], { homeDir });
    expect(setResult.code).toBe(0);
    expect(setResult.stdout).toContain('Updated api-base-url');

    const getResult = await runCliWithMocks(['config', 'get', 'api-base-url'], { homeDir });
    expect(getResult.code).toBe(0);
    expect(getResult.stdout).toContain('api-base-url: https://api.example.com');
  });

  it('fails with unsupported config key', async () => {
    const result = await runCliWithMocks(['config', 'get', 'unknown-key']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('Unsupported config key');
  });

  it('fails with invalid timeout-ms value', async () => {
    const result = await runCliWithMocks(['config', 'set', 'timeout-ms', '-1']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
  });
});
