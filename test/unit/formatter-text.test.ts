import { describe, expect, it } from 'vitest';

import { formatLogoutResult } from '../../src/formatters/text';

describe('formatLogoutResult', () => {
  it('returns removed message when api key is cleared', () => {
    expect(formatLogoutResult(true, '/tmp/.xcrawl/config.json')).toBe('API key removed from: /tmp/.xcrawl/config.json');
  });

  it('returns no-op message when no key exists', () => {
    expect(formatLogoutResult(false, '/tmp/.xcrawl/config.json')).toBe('No local API key found. Already logged out.');
  });
});
