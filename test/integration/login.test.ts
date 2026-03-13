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

  it('shows parse error when api key is missing', async () => {
    const result = await runCliWithMocks(['login']);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('api-key');
  });

  it('supports json output', async () => {
    const result = await runCliWithMocks(['login', '--api-key', 'test-key', '--json']);

    expect(result.code).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});
