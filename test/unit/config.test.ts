import { describe, expect, it } from 'vitest';

import { DEFAULT_RUNTIME_CONFIG } from '../../src/core/constants';
import { resolveRuntimeConfig } from '../../src/core/config';

describe('resolveRuntimeConfig', () => {
  it('merges by flags > env > local > defaults', () => {
    const resolved = resolveRuntimeConfig({
      flags: { apiBaseUrl: 'https://flag.example.com', timeoutMs: 1000 },
      env: { apiBaseUrl: 'https://env.example.com', apiKey: 'env-key' },
      local: { apiBaseUrl: 'https://local.example.com', apiKey: 'local-key', timeoutMs: 8000 },
      defaults: DEFAULT_RUNTIME_CONFIG
    });

    expect(resolved.apiBaseUrl).toBe('https://flag.example.com');
    expect(resolved.apiKey).toBe('env-key');
    expect(resolved.timeoutMs).toBe(1000);
  });
});
