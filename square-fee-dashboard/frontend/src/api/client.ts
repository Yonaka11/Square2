// Thin API client. All calls go to the LOCAL backend via the /api proxy.
import type {
  CatalogItem,
  Category,
  DashboardOverview,
  FeeRules,
  MonthlyFeeReport,
  ReportSnapshot,
  SalesAnalytics,
  SyncStatus,
  WebhookEvent,
} from '../types';

const BASE = '/api';
const TOKEN_KEY = 'sfd_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Lets the AuthGate react when the server rejects a token (session expired).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401 && !path.startsWith('/auth')) {
    clearToken();
    onUnauthorized?.();
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getOverview: (startDate?: string, endDate?: string) => {
    const q = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
    return request<DashboardOverview>(`/dashboard/overview${q}`);
  },
  getMonthlyFee: (startDate: string, endDate: string) =>
    request<MonthlyFeeReport>(`/reports/monthly-fee?startDate=${startDate}&endDate=${endDate}`),
  getSalesAnalytics: (startDate: string, endDate: string) =>
    request<SalesAnalytics>(`/reports/sales-analytics?startDate=${startDate}&endDate=${endDate}`),
  saveSnapshot: (startDate: string, endDate: string) =>
    request(`/reports/snapshots`, { method: 'POST', body: JSON.stringify({ startDate, endDate }) }),
  getSnapshots: () => request<ReportSnapshot[]>(`/reports/snapshots`),
  getCatalogItems: () => request<CatalogItem[]>(`/catalog/items`),
  createCatalogItem: (payload: Record<string, unknown>) =>
    request<CatalogItem>(`/catalog/items`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCatalogItem: (id: string, payload: Record<string, unknown>) =>
    request<CatalogItem>(`/catalog/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getMissingBarcode: () => request<CatalogItem[]>(`/catalog/reports/missing-barcode`),
  getUncategorized: () => request<CatalogItem[]>(`/catalog/reports/uncategorized`),
  getFeeRules: () => request<FeeRules>(`/settings/fee-rules`),
  updateFeeRules: (payload: Record<string, unknown>) =>
    request<FeeRules>(`/settings/fee-rules`, { method: 'PUT', body: JSON.stringify(payload) }),
  getCategories: () => request<Category[]>(`/settings/categories`),
  getSyncStatus: () => request<SyncStatus>(`/sync/status`),
  syncSquare: () => request(`/sync/square`, { method: 'POST' }),
  getWebhookEvents: () => request<WebhookEvent[]>(`/webhooks/recent`),
  getAuthStatus: () => request<{ authRequired: boolean }>(`/auth/status`),
  login: (password: string) =>
    request<{ token: string; authRequired: boolean }>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  csvUrl: (startDate: string, endDate: string) =>
    `${BASE}/exports/monthly-fee.csv?startDate=${startDate}&endDate=${endDate}`,
};
