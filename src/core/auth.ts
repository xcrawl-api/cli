import { AuthError } from './errors';

export function requireApiKey(apiKey: string | undefined): string {
  if (apiKey && apiKey.trim().length > 0) {
    return apiKey;
  }

  throw new AuthError(
    'Missing API key.',
    'Run `xcrawl login --api-key <key>` first, or set `XCRAWL_API_KEY`.'
  );
}
