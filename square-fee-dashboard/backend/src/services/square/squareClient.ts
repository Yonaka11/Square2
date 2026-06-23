// Square API client placeholder.
// ---------------------------------------------------------------------------
// This file centralizes Square credentials and (eventually) the Square SDK
// client. For the first version we never call Square directly; we only read
// the environment so other modules can decide whether real sync is possible.
//
// To enable real Square Sandbox calls later:
//   1. `npm install square` in the backend.
//   2. Instantiate the Square Client here using the access token + environment.
//   3. Implement the sync* modules using this client.
// ---------------------------------------------------------------------------

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

/**
 * Placeholder for the real Square client. Returns null until the Square SDK is
 * wired up. Kept so sync modules can import a single accessor.
 */
export function getSquareClient(): unknown | null {
  if (!hasSquareCredentials()) return null;
  // TODO: return a configured Square SDK Client instance here.
  return null;
}
