import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('scraper command', () => {
  it('lists supported web scrapers', async () => {
    const result = await runCliWithMocks(['scraper', '--list-scrapers'], {
      api: {
        get: async (requestPath) => {
          expect(requestPath).toBe('/web_v1/scraping/xcrawl');

          return {
            code: 200,
            data: {
              list: [
                { scraper: 'reddit_user_posts', name: 'Reddit User Posts', website: 'Reddit' },
                { scraper: 'amazon_search', name: 'Amazon Product Search', website: 'Amazon' }
              ]
            }
          };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Supported web scrapers: 2');
    expect(result.stdout).toContain('reddit_user_posts');
    expect(result.stdout).toContain('Inspect one scraper with');
  });

  it('describes the selected scraper including response fields', async () => {
    const result = await runCliWithMocks(['scraper', 'reddit_user_posts', '--describe'], {
      api: {
        get: async (requestPath) => {
          expect(requestPath).toBe('/web_v1/scraping/xcrawl-info');

          return {
            code: 200,
            data: {
              name: 'Reddit User Posts',
              engine: 'reddit_user_posts',
              website: 'Reddit',
              website_url: 'reddit.com',
              format: ['json'],
              version: '1.0.0',
              request_params: {
                properties: {
                  url_list: {
                    must: true,
                    type: 'array',
                    class_name: 'Input',
                    description: 'Input URL list.'
                  }
                }
              },
              response_dict: [
                {
                  name: 'result',
                  type: 'list',
                  sub: [
                    {
                      name: 'results_list',
                      type: 'list',
                      sub: [{ name: 'title', type: 'string', desc: 'Article title.' }]
                    }
                  ]
                }
              ]
            }
          };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Scraper: reddit_user_posts');
    expect(result.stdout).toContain('url_list [array] required / Input');
    expect(result.stdout).toContain('result[].results_list[].title [string]');
  });

  it('runs a scraper request with typed parameters', async () => {
    const result = await runCliWithMocks(
      ['scraper', 'reddit_user_posts', 'url_list=["https://www.reddit.com/r/test/comments/abc"]', '--api-key', 'flag-key'],
      {
        api: {
          get: async (requestPath) => {
            expect(requestPath).toBe('/web_v1/scraping/xcrawl-info');

            return {
              code: 200,
              data: {
                name: 'Reddit User Posts',
                engine: 'reddit_user_posts',
                format: ['json'],
                request_params: {
                  properties: {
                    url_list: { must: true, type: 'array', class_name: 'Input' }
                  }
                }
              }
            };
          },
          post: async (requestPath, options) => {
            expect(requestPath).toBe('/v1/data');
            expect(options?.body).toEqual({
              engine: 'reddit_user_posts',
              url_list: ['https://www.reddit.com/r/test/comments/abc']
            });

            return {
              status: 'completed',
              data: {
                data: {
                  result: {
                    results: [
                      {
                        content: {
                          title: 'Example Reddit Post'
                        }
                      }
                    ]
                  }
                }
              }
            };
          }
        }
      }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Result items: 1');
    expect(result.stdout).toContain('"title": "Example Reddit Post"');
  });

  it('fails when required parameters are missing', async () => {
    const result = await runCliWithMocks(['scraper', 'reddit_user_posts', '--api-key', 'flag-key'], {
      api: {
        get: async () => ({
          code: 200,
          data: {
            name: 'Reddit User Posts',
            engine: 'reddit_user_posts',
            format: ['json'],
            request_params: {
              properties: {
                url_list: { must: true, type: 'array', class_name: 'Input' }
              }
            }
          }
        })
      }
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('Missing required scraper parameter: url_list');
  });
});
