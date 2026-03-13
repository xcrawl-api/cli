import type { ApiTransport, RawSearchResponse, SearchRequest, SearchResponse } from '../types/api';

export async function searchWeb(client: ApiTransport, request: SearchRequest): Promise<SearchResponse> {
  const raw = await client.post<RawSearchResponse>('/v1/search', {
    body: {
      query: request.query,
      limit: request.limit,
      location: request.country,
      language: request.language
    }
  });

  const rawResults = raw.data?.data ?? [];

  return {
    query: raw.query ?? request.query,
    results: rawResults
      .filter((item) => typeof item.url === 'string' && item.url.length > 0)
      .map((item) => ({
        title: item.title?.trim() || 'Untitled',
        url: item.url as string,
        snippet: item.description
      }))
  };
}
