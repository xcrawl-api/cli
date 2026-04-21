import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('serp command', () => {
  it('lists supported engines', async () => {
    const result = await runCliWithMocks(['serp', '--list-engines'], {
      api: {
        get: async (requestPath) => {
          expect(requestPath).toBe('/web_v1/scraping/xcrawl');

          return {
            code: 200,
            data: {
              list: [
                { scraper: 'google_search', name: 'Google Search', website: 'Google' },
                { scraper: 'bing_search', name: 'Bing Search', website: 'Bing' }
              ]
            }
          };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Supported SERP engines: 2');
    expect(result.stdout).toContain('google_search');
    expect(result.stdout).toContain('Inspect one engine with');
  });

  it('describes the selected engine', async () => {
    const result = await runCliWithMocks(['serp', 'bing_shopping', '--describe'], {
      api: {
        get: async (requestPath) => {
          expect(requestPath).toBe('/web_v1/scraping/xcrawl-info');

          return {
            code: 200,
            data: {
              name: 'Bing Shopping Search',
              engine: 'bing_shopping_search',
              website: 'Bing Shopping',
              website_url: 'bingshopping.com',
              format: ['json'],
              version: '1.0.0',
              request_params: {
                properties: {
                  q: {
                    must: true,
                    type: 'string',
                    class_name: 'Search Query',
                    description: 'Search query.'
                  },
                  cc: {
                    must: false,
                    type: 'string',
                    class_name: 'Localization',
                    description: 'Country code.'
                  }
                }
              }
            }
          };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Scraper: bing_shopping');
    expect(result.stdout).toContain('q [string] required / Search Query');
    expect(result.stdout).toContain('cc [string] optional / Localization');
  });

  it('runs a SERP request with typed parameters', async () => {
    const result = await runCliWithMocks(['serp', 'google_search', 'q=xcrawl cli', '--param', 'page=2', '--param', 'no_cache=true', '--api-key', 'flag-key'], {
      api: {
        get: async (requestPath) => {
          expect(requestPath).toBe('/web_v1/scraping/xcrawl-info');

          return {
            code: 200,
            data: {
              name: 'Google Search',
              engine: 'google_search',
              format: ['json'],
              request_params: {
                properties: {
                  q: { must: true, type: 'string', class_name: 'Search Query' },
                  page: { must: false, type: 'integer', class_name: 'Pagination' },
                  no_cache: { must: false, type: 'boolean', class_name: 'Request Controls' }
                }
              }
            }
          };
        },
        post: async (requestPath, options) => {
          expect(requestPath).toBe('/v1/serp');
          expect(options?.body).toEqual({
            engine: 'google_search',
            q: 'xcrawl cli',
            page: 2,
            no_cache: true
          });

          return {
            search_metadata: {
              id: 'serp_123',
              status: 'completed'
            },
            search_parameters: {
              engine: 'google_search',
              q: 'xcrawl cli',
              page: 2,
              no_cache: true
            },
            total_credits_used: 1,
            organic_results: [{ title: 'XCrawl', link: 'https://xcrawl.com' }]
          };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Status: completed');
    expect(result.stdout).toContain('Search ID: serp_123');
    expect(result.stdout).toContain('"organic_results"');
  });

  it('fails when required parameters are missing', async () => {
    const result = await runCliWithMocks(['serp', 'google_search', '--api-key', 'flag-key'], {
      api: {
        get: async () => ({
          code: 200,
          data: {
            name: 'Google Search',
            engine: 'google_search',
            format: ['json'],
            request_params: {
              properties: {
                q: { must: true, type: 'string', class_name: 'Search Query' }
              }
            }
          }
        })
      }
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('Missing required SERP parameter: q');
  });
});
