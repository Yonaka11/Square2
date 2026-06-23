// Frontend types mirroring the backend API responses. Money is integer cents.

export interface DashboardOverview {
  startDate: string;
  endDate: string;
  grossSales: number;
  refunds: number;
  discounts: number;
  excludedCategorySales: number;
  feeLiableSales: number;
  estimatedFeeOwed: number;
  orderCount: number;
  averageTicket: number;
}

export interface CategoryBreakdownRow {
  categoryId: string | null;
  categoryName: string;
  grossSales: number;
  discounts: number;
  taxes: number;
  excluded: boolean;
  netSales: number;
}

export interface MonthlyFeeReport {
  startDate: string;
  endDate: string;
  grossSales: number;
  refunds: number;
  discounts: number;
  excludedCategorySales: number;
  taxes: number;
  feeLiableSales: number;
  feePercentage: number;
  feeOwed: number;
  orderCount: number;
  categoryBreakdown: CategoryBreakdownRow[];
  rulesApplied: {
    discountsReduce: boolean;
    taxesExcluded: boolean;
    refundDeductionMethod: string;
    excludedCategoryIds: string[];
  };
}

export interface ReportSnapshot {
  id: number;
  startDate: string;
  endDate: string;
  feeOwed: number;
  createdAt: string;
}

export interface SalesAnalytics {
  startDate: string;
  endDate: string;
  salesByDay: Array<{ date: string; sales: number; orders: number }>;
  salesByDayOfWeek: Array<{ dayOfWeek: string; sales: number; orders: number }>;
  busiestDays: Array<{ date: string; sales: number }>;
  slowestDays: Array<{ date: string; sales: number }>;
  salesByHour: Array<{ hour: number; sales: number; orders: number }>;
  busiestHours: Array<{ hour: number; sales: number }>;
  slowestHours: Array<{ hour: number; sales: number }>;
  topItemsByRevenue: Array<{ name: string; revenue: number; quantity: number }>;
  topItemsByQuantity: Array<{ name: string; revenue: number; quantity: number }>;
  topCategories: Array<{ categoryName: string; revenue: number; quantity: number }>;
  refundRate: number;
  discountImpact: number;
  averageTicketOverTime: Array<{ date: string; averageTicket: number }>;
}

export interface CatalogItem {
  id: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  price_money: number;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  track_inventory: number;
  quantity: number;
  ready_to_sync: number;
  square_object_id: string | null;
  is_draft: number;
  created_at: string;
  updated_at: string;
}

export type RefundDeductionMethod = 'refund_date' | 'original_sale_date';

export interface FeeRules {
  id: number;
  fee_percentage: number;
  excluded_category_ids: string[];
  taxes_excluded: number;
  discounts_reduce: number;
  refund_deduction_method: RefundDeductionMethod;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface WebhookEvent {
  id: number;
  eventId: string | null;
  eventType: string | null;
  merchantId: string | null;
  signatureValid: number;
  receivedAt: string;
}

export interface SyncStatus {
  lastSync: {
    syncType: string;
    ordersSynced: number;
    paymentsSynced: number;
    refundsSynced: number;
    catalogItemsSynced: number;
    status: string;
    error: string | null;
    createdAt: string;
  } | null;
  counts: { orders: number; payments: number; refunds: number; catalogItems: number };
  recent: Array<{
    id: number;
    syncType: string;
    ordersSynced: number;
    paymentsSynced: number;
    refundsSynced: number;
    catalogItemsSynced: number;
    status: string;
    error: string | null;
    createdAt: string;
  }>;
  squareConfigured: boolean;
}
