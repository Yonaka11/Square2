// Shared backend TypeScript types.
// IMPORTANT: All monetary values are stored and transported as integer cents.

export type RefundDeductionMethod = 'refund_date' | 'original_sale_date';

export interface Location {
  id: string;
  name: string;
  currency: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  location_id: string;
  state: string;
  created_at: string; // ISO timestamp of the original sale
  gross_sales_money: number; // cents, sum of line item gross sales
  total_discount_money: number; // cents
  total_tax_money: number; // cents
  total_money: number; // cents, net amount charged
}

export interface OrderLineItem {
  id: number;
  order_id: string;
  uid: string;
  name: string;
  category_id: string | null;
  quantity: number;
  base_price_money: number; // cents (unit price)
  gross_sales_money: number; // cents (unit price * quantity, pre-discount/tax)
  total_discount_money: number; // cents
  total_tax_money: number; // cents
  total_money: number; // cents
  catalog_object_id: string | null;
}

export interface Payment {
  id: string;
  order_id: string;
  amount_money: number; // cents
  tip_money: number; // cents
  processing_fee_money: number; // cents
  status: string;
  created_at: string;
}

export interface Refund {
  id: string;
  payment_id: string;
  order_id: string;
  amount_money: number; // cents
  reason: string;
  status: string;
  created_at: string; // refund date
  order_created_at: string; // original sale date
}

export interface CatalogItem {
  id: string;
  name: string;
  category_id: string | null;
  price_money: number; // cents
  sku: string | null;
  barcode: string | null;
  description: string | null;
  track_inventory: number; // 0/1 boolean
  quantity: number;
  ready_to_sync: number; // 0/1 boolean
  square_object_id: string | null;
  is_draft: number; // 0/1 boolean
  created_at: string;
  updated_at: string;
}

export interface FeeRules {
  id: number;
  fee_percentage: number; // e.g. 25 means 25%
  excluded_category_ids: string[];
  taxes_excluded: number; // 0/1 boolean
  discounts_reduce: number; // 0/1 boolean
  refund_deduction_method: RefundDeductionMethod;
  updated_at: string;
}

export interface SyncLog {
  id: number;
  sync_type: string;
  orders_synced: number;
  payments_synced: number;
  refunds_synced: number;
  catalog_items_synced: number;
  status: string;
  error: string | null;
  created_at: string;
}

export interface MonthlyFeeReportSnapshot {
  id: number;
  start_date: string;
  end_date: string;
  fee_owed_money: number; // cents
  payload: string; // JSON string of the full report
  created_at: string;
}
