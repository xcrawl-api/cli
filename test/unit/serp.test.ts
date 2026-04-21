import { describe, expect, it } from 'vitest';

import { parseSerpParams } from '../../src/core/serp';
import type { SerpEngineDefinition } from '../../src/types/api';

const definition: SerpEngineDefinition = {
  scraper: 'google_search',
  name: 'Google Search',
  engine: 'google_search',
  formats: ['json'],
  parameters: [
    {
      name: 'q',
      type: 'string',
      required: true,
      group: 'Search Query'
    },
    {
      name: 'page',
      type: 'integer',
      required: false,
      group: 'Pagination'
    },
    {
      name: 'no_cache',
      type: 'boolean',
      required: false,
      group: 'Request Controls'
    }
  ]
};

describe('parseSerpParams', () => {
  it('coerces string, integer, and boolean values from key=value entries', () => {
    const result = parseSerpParams(['q=xcrawl cli', 'page=2', 'no_cache=true'], definition);

    expect(result).toEqual({
      q: 'xcrawl cli',
      page: 2,
      no_cache: true
    });
  });

  it('fails when required parameters are missing', () => {
    expect(() => parseSerpParams([], definition)).toThrowError(/Missing required SERP parameter: q/);
  });

  it('fails when the parameter is unsupported', () => {
    expect(() => parseSerpParams(['foo=bar', 'q=xcrawl'], definition)).toThrowError(
      /Unsupported SERP parameter: foo/
    );
  });
});
