// Square API client.
// ---------------------------------------------------------------------------
// We talk to Square's REST API directly using Node's built-in fetch. This keeps
// the integration dependency-light and avoids SDK version churn. Square REST
// "Money" amounts are already integer minor units (cents), which matches how we
// store money everywhere in this app.
//
// Sandbox is the default. Set credentials in backend/.env:
//   SQUARE_ACCESS_TOKEN, SQUARE_ENVIRONMENT=sandbox, SQUARE_LOCATION_ID
// ---------------------------------------------------------------------------

// Pinned Square API version (see https://developer.squareup.com/docs/build-basics/versioning-overview).
export const SQUARE_API_VERSION = '2026-05-20';

export interface SquareConfig {
  accessToken: string;
  environment: string;
  locationId: string;
}

export function getSquareConfig(): SquareConfig {
  return {
    accessToken: process.env.SQUARE_ACCESS_TOKEN ?? '',
    environment: process.env.SQUARE_ENVIRONMENT ?? 'sandbox',
    locationId: process.env.SQUARE_LOCATION_ID ?? '',
  };
}

/** True only when all required Square credentials are present. */
export function hasSquareCredentials(): boolean {
  const cfg = getSquareConfig();
  return Boolean(cfg.accessToken && cfg.locationId);
}

/** Base URL for the configured environment. */
export function squareBaseUrl(environment = getSquareConfig().environment): string {
  return environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

export class SquareApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SquareApiError';
    this.status = status;
  }
}

/**
 * Make an authenticated request to the Square REST API and return the parsed
 * JSON body. Throws SquareApiError on non-2xx responses with a useful message.
 */
export async function squareFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const cfg = getSquareConfig();
  if (!cfg.accessToken) {
    throw new SquareApiError('Missing SQUARE_ACCESS_TOKEN', 400);
  }
  const res = await fetch(`${squareBaseUrl(cfg.environment)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Square-Version': SQUARE_API_VERSION,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail =
      body?.errors?.map((e: any) => `${e.category}/${e.code}: ${e.detail}`).join('; ') ||
      `HTTP ${res.status}`;
    throw new SquareApiError(`Square API error (${res.status}): ${detail}`, res.status);
  }
  return body as T;
}
