import { describe, expect, it } from 'vitest';

import { parseLlmParams } from '../../src/core/llm';
import type { LlmModelDefinition } from '../../src/types/api';

const definition: LlmModelDefinition = {
  scraper: 'chatgpt_model',
  name: 'ChatGPT Web Search',
  engine: 'chatgpt_web_search',
  formats: ['json'],
  parameters: [
    {
      name: 'prompt',
      type: 'string',
      required: true,
      group: 'Search Prompt'
    },
    {
      name: 'location',
      type: 'string',
      required: false,
      group: 'Geographic Location',
      enumValues: ['US', 'UK']
    },
    {
      name: 'web_search',
      type: 'boolean',
      required: false,
      group: 'websearch'
    }
  ]
};

describe('parseLlmParams', () => {
  it('coerces string and boolean values from key=value entries', () => {
    const result = parseLlmParams(['prompt=What is XCrawl CLI?', 'location=US', 'web_search=true'], definition);

    expect(result).toEqual({
      prompt: 'What is XCrawl CLI?',
      location: 'US',
      web_search: true
    });
  });

  it('fails when required parameters are missing', () => {
    expect(() => parseLlmParams([], definition)).toThrowError(/Missing required LLM parameter: prompt/);
  });

  it('fails when the parameter is unsupported', () => {
    expect(() => parseLlmParams(['query=xcrawl', 'prompt=What is XCrawl CLI?'], definition)).toThrowError(
      /Unsupported LLM parameter: query/
    );
  });
});
