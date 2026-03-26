import { AuthError } from '../core/errors';
import type { ApiTransport, CliAuthStatusResponse } from '../types/api';

function normalizeCode(code: string | number | undefined): string {
  return String(code ?? '');
}

export interface CliAuthStatus {
  status: 'pending' | 'authorized';
  apiKey?: string;
}

export async function fetchCliAuthStatus(
  client: ApiTransport,
  sessionId: string,
  codeVerifier: string
): Promise<CliAuthStatus> {
  const response = await client.post<CliAuthStatusResponse>('/web_v1/auth/cli/status', {
    body: {
      session_id: sessionId,
      code_verifier: codeVerifier
    }
  });

  const code = normalizeCode(response.code);
  if (code === '543') {
    return { status: 'pending' };
  }

  if (code === '200') {
    const apiKey = response.data?.api_key;
    if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
      return { status: 'authorized', apiKey };
    }

    throw new AuthError(
      'Browser authentication completed without an API key.',
      'Retry `xcrawl login --browser`, or enter the API key manually.'
    );
  }

  const message = response.message ?? response.msg ?? `Unexpected authentication response code: ${code || 'unknown'}`;
  throw new AuthError(message, 'Retry browser authentication, or enter the API key manually.');
}
