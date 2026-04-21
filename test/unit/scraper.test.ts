import { describe, expect, it } from 'vitest';

import { parseScraperParams } from '../../src/core/scraper';
import type { ScraperDefinition } from '../../src/types/api';

const definition: ScraperDefinition = {
  scraper: 'reddit_user_posts',
  name: 'Reddit User Posts',
  engine: 'reddit_user_posts',
  formats: ['json'],
  parameters: [
    {
      name: 'url_list',
      type: 'array',
      required: true,
      group: 'Input'
    },
    {
      name: 'page',
      type: 'integer',
      required: false,
      group: 'Pagination'
    }
  ],
  responseFields: []
};

describe('parseScraperParams', () => {
  it('coerces array and integer values from key=value entries', () => {
    const result = parseScraperParams(
      ['url_list=["https://www.reddit.com/r/test/comments/abc"]', 'page=2'],
      definition
    );

    expect(result).toEqual({
      url_list: ['https://www.reddit.com/r/test/comments/abc'],
      page: 2
    });
  });

  it('fails when required parameters are missing', () => {
    expect(() => parseScraperParams([], definition)).toThrowError(/Missing required scraper parameter: url_list/);
  });

  it('fails when the parameter is unsupported', () => {
    expect(() =>
      parseScraperParams(['unknown=1', 'url_list=["https://www.reddit.com/r/test/comments/abc"]'], definition)
    ).toThrowError(/Unsupported scraper parameter: unknown/);
  });
});
