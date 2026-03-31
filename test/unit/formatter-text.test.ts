import { describe, expect, it } from 'vitest';

import { formatLogoutResult, formatStatus } from '../../src/formatters/text';

describe('formatLogoutResult', () => {
  it('returns removed message when api key is cleared', () => {
    expect(formatLogoutResult(true, '/tmp/.xcrawl/config.json')).toBe('API key removed from: /tmp/.xcrawl/config.json');
  });

  it('returns no-op message when no key exists', () => {
    expect(formatLogoutResult(false, '/tmp/.xcrawl/config.json')).toBe('No local API key found. Already logged out.');
  });
});

describe('formatStatus', () => {
  it('renders the cli version header and omits removed profile fields', () => {
    const output = formatStatus({
      cliVersion: '0.2.7',
      creditLevel: 2,
      totalCredits: 10000,
      remainCredits: 6500,
      consumedCredits: 3500,
      todayCredits: 120,
      nextResetAt: '2026-04-01 00:00:00',
      expiredAt: '2026-12-31 23:59:59',
      packageTitle: 'Pro Plan'
    });

    expect(output).toContain('XCrawl cli v0.2.7');
    expect(output).not.toContain('Email:');
    expect(output).not.toContain('Created At:');
    expect(output).toContain('Remaining Credits: 6500');
  });
});
