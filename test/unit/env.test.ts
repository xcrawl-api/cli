import { describe, expect, it } from 'vitest';

import { readEnvConfig } from '../../src/core/env';

describe('readEnvConfig', () => {
  it('parses supported env variables', () => {
    const env = readEnvConfig({
      XCRAWL_API_KEY: 'env-key',
      XCRAWL_API_BASE_URL: 'https://env.example.com',
      XCRAWL_TIMEOUT_MS: '5000',
      XCRAWL_DEBUG: 'true',
      XCRAWL_OUTPUT_DIR: 'out'
    });

    expect(env.apiKey).toBe('env-key');
    expect(env.apiBaseUrl).toBe('https://env.example.com');
    expect(env.timeoutMs).toBe(5000);
    expect(env.debug).toBe(true);
    expect(env.outputDir).toBe('out');
  });
});
