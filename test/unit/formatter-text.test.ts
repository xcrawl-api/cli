import { describe, expect, it } from 'vitest';

import {
  formatLogoutResult,
  formatSerpEngineDefinition,
  formatSerpResponse,
  formatStatus
} from '../../src/formatters/text';

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

describe('formatSerpEngineDefinition', () => {
  it('renders engine metadata and parameter summaries', () => {
    const output = formatSerpEngineDefinition({
      scraper: 'google_search',
      name: 'Google Search',
      engine: 'google_search',
      website: 'Google',
      websiteUrl: 'google.com',
      formats: ['json'],
      version: '1.0.0',
      description: 'General Google web search.',
      parameters: [
        {
          name: 'q',
          type: 'string',
          required: true,
          group: 'Search Query',
          description: 'Primary query text.'
        }
      ]
    });

    expect(output).toContain('Scraper: google_search');
    expect(output).toContain('Description: General Google web search.');
    expect(output).toContain('q [string] required / Search Query');
  });
});

describe('formatSerpResponse', () => {
  it('renders a summary header before the JSON payload', () => {
    const output = formatSerpResponse({
      search_metadata: {
        status: 'completed',
        id: 'serp_123'
      },
      search_parameters: {
        engine: 'google_search',
        q: 'xcrawl'
      },
      total_credits_used: 1,
      organic_results: [{ title: 'XCrawl' }]
    });

    expect(output).toContain('Status: completed');
    expect(output).toContain('Search ID: serp_123');
    expect(output).toContain('Sections: organic_results (1)');
    expect(output).toContain('"organic_results"');
  });
});
