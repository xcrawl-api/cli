import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('root authentication flow', () => {
  it('prompts for manual authentication when invoked without arguments', async () => {
    const result = await runCliWithMocks([], {
      isInteractive: true,
      stdinText: '2\nxc-manual-key\n'
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('XCrawl CLI');
    expect(result.stdout).toContain('Enter API key:');

    const configPath = path.join(result.homeDir, '.xcrawl', 'config.json');
    const content = await readFile(configPath, 'utf8');
    expect(content).toContain('xc-manual-key');
  });
});
