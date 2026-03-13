import type { ApiTransport, MapRequest, MapResponse, RawMapResponse } from '../types/api';

export async function fetchMap(client: ApiTransport, request: MapRequest): Promise<MapResponse> {
  const raw = await client.post<RawMapResponse>('/v1/map', {
    body: {
      url: request.url,
      limit: request.limit
    }
  });

  const rawLinks = raw.data?.links ?? [];
  const links = rawLinks
    .map((item) => {
      if (typeof item === 'string') {
        return { url: item };
      }

      if (item?.url) {
        return { url: item.url, title: item.title };
      }

      return undefined;
    })
    .filter((item): item is { url: string; title?: string } => Boolean(item));

  return {
    url: raw.url ?? request.url,
    links,
    total: raw.data?.total_links ?? links.length
  };
}
