import type { ApiTransport, CreditsResponse } from '../types/api';

export async function fetchCredits(client: ApiTransport): Promise<CreditsResponse> {
  return client.get<CreditsResponse>('/v1/credits');
}
