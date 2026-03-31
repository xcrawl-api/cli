import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createDefaultContext, projectRoot } from '../../src/index';

describe('createDefaultContext', () => {
  it('falls back to package.json version when npm package env is missing', () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as { version: string };
    const context = createDefaultContext({ env: {} });

    expect(context.version).toBe(packageJson.version);
  });

  it('prefers npm_package_version when available', () => {
    const context = createDefaultContext({
      env: {
        npm_package_version: '9.9.9-test'
      }
    });

    expect(context.version).toBe('9.9.9-test');
  });
});
