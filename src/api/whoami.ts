import type { ApiTransport, WhoAmIResponse } from '../types/api';

export async function fetchWhoAmI(client: ApiTransport): Promise<WhoAmIResponse> {
  return client.get<WhoAmIResponse>('/v1/whoami');
}
