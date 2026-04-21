import { describe, expect, it } from 'vitest';

import { runCliWithMocks } from '../fixtures/cli';

describe('llm command', () => {
  it('lists supported llm models', async () => {
    const result = await runCliWithMocks(['llm', '--list-models'], {
      api: {
        get: async (requestPath) => {
          expect(requestPath).toBe('/web_v1/scraping/xcrawl');

          return {
            code: 200,
            data: {
              list: [
                { scraper: 'chatgpt_model', name: 'ChatGPT Web Search', website: 'OpenAI' },
                { scraper: 'google_ai_model', name: 'Google AI Search', website: 'Google' }
              ]
            }
          };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Supported LLM models: 2');
    expect(result.stdout).toContain('chatgpt_model');
    expect(result.stdout).toContain('Inspect one model with');
  });

  it('describes the selected llm model', async () => {
    const result = await runCliWithMocks(['llm', 'chatgpt_model', '--describe'], {
      api: {
        get: async (requestPath) => {
          expect(requestPath).toBe('/web_v1/scraping/xcrawl-info');

          return {
            code: 200,
            data: {
              name: 'ChatGPT Web Search',
              engine: 'chatgpt_web_search',
              website: 'OpenAI',
              website_url: 'https://chatgpt.com',
              format: ['json'],
              version: '1.0.0',
              request_params: {
                properties: {
                  prompt: {
                    must: true,
                    type: 'string',
                    class_name: 'Search Prompt',
                    description: 'The user query.'
                  },
                  location: {
                    must: false,
                    type: 'string',
                    class_name: 'Geographic Location',
                    description: 'The geographic context.'
                  }
                }
              }
            }
          };
        }
      }
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Model: chatgpt_model');
    expect(result.stdout).toContain('prompt [string] required / Search Prompt');
    expect(result.stdout).toContain('location [string] optional / Geographic Location');
  });

  it('runs an llm request with typed parameters', async () => {
    const result = await runCliWithMocks(
      ['llm', 'chatgpt_model', 'prompt=What is XCrawl CLI?', '--param', 'location=US', '--api-key', 'flag-key'],
      {
        api: {
          get: async (requestPath) => {
            expect(requestPath).toBe('/web_v1/scraping/xcrawl-info');

            return {
              code: 200,
              data: {
                name: 'ChatGPT Web Search',
                engine: 'chatgpt_web_search',
                format: ['json'],
                request_params: {
                  properties: {
                    prompt: { must: true, type: 'string', class_name: 'Search Prompt' },
                    location: { must: false, type: 'string', class_name: 'Geographic Location' }
                  }
                }
              }
            };
          },
          post: async (requestPath, options) => {
            expect(requestPath).toBe('/v1/llm');
            expect(options?.body).toEqual({
              engine: 'chatgpt_model',
              prompt: 'What is XCrawl CLI?',
              location: 'US'
            });

            return {
              llm_id: 'llm_123',
              status: 'completed',
              engine: 'chatgpt_model',
              prompt: 'What is XCrawl CLI?',
              total_credits_used: 1,
              data: {
                markdown: 'XCrawl CLI is a command-line tool.'
              }
            };
          }
        }
      }
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('LLM ID: llm_123');
    expect(result.stdout).toContain('XCrawl CLI is a command-line tool.');
  });

  it('fails when required parameters are missing', async () => {
    const result = await runCliWithMocks(['llm', 'chatgpt_model', '--api-key', 'flag-key'], {
      api: {
        get: async () => ({
          code: 200,
          data: {
            name: 'ChatGPT Web Search',
            engine: 'chatgpt_web_search',
            format: ['json'],
            request_params: {
              properties: {
                prompt: { must: true, type: 'string', class_name: 'Search Prompt' }
              }
            }
          }
        })
      }
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('[VALIDATION_ERROR]');
    expect(result.stderr).toContain('Missing required LLM parameter: prompt');
  });
});
