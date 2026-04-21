import { describe, expect, it } from 'vitest';

import {
  formatLlmModelDefinition,
  formatLlmResponse,
  formatLogoutResult,
  formatScraperDefinition,
  formatScraperResponse,
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

describe('formatScraperDefinition', () => {
  it('renders scraper metadata, parameter summaries, and response fields', () => {
    const output = formatScraperDefinition({
      scraper: 'reddit_user_posts',
      name: 'Reddit User Posts',
      engine: 'reddit_user_posts',
      website: 'Reddit',
      websiteUrl: 'reddit.com',
      formats: ['json'],
      version: '1.0.0',
      description: 'Load Reddit post details.',
      parameters: [
        {
          name: 'url_list',
          type: 'array',
          required: true,
          group: 'Input',
          description: 'A list of Reddit post URLs.'
        }
      ],
      responseFields: [
        {
          path: 'result[].results_list[].title',
          type: 'string',
          description: 'Article title.'
        }
      ]
    });

    expect(output).toContain('Scraper: reddit_user_posts');
    expect(output).toContain('url_list [array] required / Input');
    expect(output).toContain('Response Fields:');
    expect(output).toContain('result[].results_list[].title [string]');
  });
});

describe('formatScraperResponse', () => {
  it('renders a summary header before the JSON payload', () => {
    const output = formatScraperResponse({
      result: [{ content: { title: 'XCrawl' } }]
    });

    expect(output).toContain('Result items: 1');
    expect(output).toContain('Top-level fields: result');
    expect(output).toContain('"result"');
  });

  it('counts nested data api results from the real response shape', () => {
    const output = formatScraperResponse({
      data: {
        data: {
          result: {
            results: [{ content: { title: 'XCrawl' } }]
          }
        }
      },
      status: 'completed'
    });

    expect(output).toContain('Result items: 1');
    expect(output).toContain('Top-level fields: data, status');
    expect(output).toContain('"results"');
  });
});

describe('formatLlmModelDefinition', () => {
  it('renders llm model metadata and parameter summaries', () => {
    const output = formatLlmModelDefinition({
      scraper: 'chatgpt_model',
      name: 'ChatGPT Web Search',
      engine: 'chatgpt_web_search',
      website: 'OpenAI',
      websiteUrl: 'https://chatgpt.com',
      formats: ['json'],
      version: '1.0.0',
      description: 'Browse with ChatGPT.',
      parameters: [
        {
          name: 'prompt',
          type: 'string',
          required: true,
          group: 'Search Prompt',
          description: 'The user query.'
        }
      ]
    });

    expect(output).toContain('Model: chatgpt_model');
    expect(output).toContain('Description: Browse with ChatGPT.');
    expect(output).toContain('prompt [string] required / Search Prompt');
  });
});

describe('formatLlmResponse', () => {
  it('renders markdown output before falling back to raw json', () => {
    const output = formatLlmResponse({
      llm_id: 'llm_123',
      status: 'completed',
      engine: 'chatgpt_model',
      prompt: 'What is XCrawl CLI?',
      total_credits_used: 1,
      data: {
        markdown: 'XCrawl CLI is a command-line tool.'
      }
    });

    expect(output).toContain('Status: completed');
    expect(output).toContain('LLM ID: llm_123');
    expect(output).toContain('Prompt: What is XCrawl CLI?');
    expect(output).toContain('XCrawl CLI is a command-line tool.');
  });
});
