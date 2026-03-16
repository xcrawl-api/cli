import type { ApiTransport, RawStatusData, RawStatusEnvelope, StatusResponse } from '../types/api';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return 0;
}

function mapStatusData(raw: RawStatusData): StatusResponse {
  return {
    username: raw.username ?? '',
    email: raw.email ?? '',
    createdAt: raw.created_at,
    creditLevel: toNumber(raw.credit_level),
    totalCredits: toNumber(raw.total_credits),
    remainCredits: toNumber(raw.remain_credits),
    consumedCredits: toNumber(raw.consumed_credits),
    todayCredits: toNumber(raw.today_credits),
    nextResetAt: raw.next_reset_at ?? null,
    expiredAt: raw.expired_at ?? null,
    packageTitle: raw.package_title ?? null
  };
}

function isStatusEnvelope(value: RawStatusEnvelope | RawStatusData): value is RawStatusEnvelope {
  return Object.prototype.hasOwnProperty.call(value, 'data');
}

export async function fetchStatus(client: ApiTransport): Promise<StatusResponse> {
  const raw = await client.get<RawStatusEnvelope | RawStatusData>('/web_v1/user/credit-user-info');

  if (isStatusEnvelope(raw)) {
    return mapStatusData(raw.data ?? {});
  }

  return mapStatusData(raw);
}
