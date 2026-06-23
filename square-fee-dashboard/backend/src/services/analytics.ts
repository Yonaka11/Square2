// Sales analytics aggregations. All money values are integer cents.
import { db } from '../db/database.js';
import { dateRangeBounds, dayOfWeekName } from '../utils/dates.js';

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
  refundRate: number; // percentage (refund $ / gross $)
  discountImpact: number; // percentage (discount $ / gross $)
  averageTicketOverTime: Array<{ date: string; averageTicket: number }>;
}

export function computeSalesAnalytics(startDate: string, endDate: string): SalesAnalytics {
  const { startIso, endIso } = dateRangeBounds(startDate, endDate);

  // Sales by day (uses order net total).
  const dayRows = db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS date,
              SUM(total_money) AS sales,
              COUNT(*) AS orders
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY date
       ORDER BY date ASC`
    )
    .all(startIso, endIso) as Array<{ date: string; sales: number; orders: number }>;

  // Sales by day of week and by hour (computed in JS from raw order rows).
  const orderRows = db
    .prepare(
      `SELECT created_at, total_money FROM orders WHERE created_at >= ? AND created_at <= ?`
    )
    .all(startIso, endIso) as Array<{ created_at: string; total_money: number }>;

  const dowMap = new Map<string, { sales: number; orders: number }>();
  const hourMap = new Map<number, { sales: number; orders: number }>();
  for (let h = 0; h < 24; h++) hourMap.set(h, { sales: 0, orders: 0 });

  for (const o of orderRows) {
    const d = new Date(o.created_at);
    const dow = dayOfWeekName(d);
    const hour = d.getHours();
    const dowEntry = dowMap.get(dow) ?? { sales: 0, orders: 0 };
    dowEntry.sales += o.total_money;
    dowEntry.orders += 1;
    dowMap.set(dow, dowEntry);
    const hourEntry = hourMap.get(hour)!;
    hourEntry.sales += o.total_money;
    hourEntry.orders += 1;
  }

  const orderedDow = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const salesByDayOfWeek = orderedDow.map((dayOfWeek) => ({
    dayOfWeek,
    sales: dowMap.get(dayOfWeek)?.sales ?? 0,
    orders: dowMap.get(dayOfWeek)?.orders ?? 0,
  }));

  const salesByHour = Array.from(hourMap.entries())
    .map(([hour, v]) => ({ hour, sales: v.sales, orders: v.orders }))
    .sort((a, b) => a.hour - b.hour);

  const busiestDays = [...dayRows].sort((a, b) => b.sales - a.sales).slice(0, 5).map((d) => ({ date: d.date, sales: d.sales }));
  const slowestDays = [...dayRows].sort((a, b) => a.sales - b.sales).slice(0, 5).map((d) => ({ date: d.date, sales: d.sales }));
  const busiestHours = [...salesByHour].filter((h) => h.orders > 0).sort((a, b) => b.sales - a.sales).slice(0, 5).map((h) => ({ hour: h.hour, sales: h.sales }));
  const slowestHours = [...salesByHour].filter((h) => h.orders > 0).sort((a, b) => a.sales - b.sales).slice(0, 5).map((h) => ({ hour: h.hour, sales: h.sales }));

  // Top items by revenue and quantity.
  const itemRows = db
    .prepare(
      `SELECT li.name AS name,
              SUM(li.total_money) AS revenue,
              SUM(li.quantity) AS quantity
       FROM order_line_items li
       JOIN orders o ON o.id = li.order_id
       WHERE o.created_at >= ? AND o.created_at <= ?
       GROUP BY li.name`
    )
    .all(startIso, endIso) as Array<{ name: string; revenue: number; quantity: number }>;

  const topItemsByRevenue = [...itemRows].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topItemsByQuantity = [...itemRows].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  // Top categories.
  const topCategories = db
    .prepare(
      `SELECT COALESCE(c.name, 'Uncategorized') AS categoryName,
              SUM(li.total_money) AS revenue,
              SUM(li.quantity) AS quantity
       FROM order_line_items li
       JOIN orders o ON o.id = li.order_id
       LEFT JOIN categories c ON c.id = li.category_id
       WHERE o.created_at >= ? AND o.created_at <= ?
       GROUP BY categoryName
       ORDER BY revenue DESC`
    )
    .all(startIso, endIso) as Array<{ categoryName: string; revenue: number; quantity: number }>;

  // Refund rate and discount impact relative to gross sales.
  const grossRow = db
    .prepare(
      `SELECT COALESCE(SUM(li.gross_sales_money),0) AS gross,
              COALESCE(SUM(li.total_discount_money),0) AS discounts
       FROM order_line_items li
       JOIN orders o ON o.id = li.order_id
       WHERE o.created_at >= ? AND o.created_at <= ?`
    )
    .get(startIso, endIso) as { gross: number; discounts: number };
  const refundRow = db
    .prepare(`SELECT COALESCE(SUM(amount_money),0) AS refunds FROM refunds WHERE created_at >= ? AND created_at <= ?`)
    .get(startIso, endIso) as { refunds: number };

  const refundRate = grossRow.gross > 0 ? (refundRow.refunds / grossRow.gross) * 100 : 0;
  const discountImpact = grossRow.gross > 0 ? (grossRow.discounts / grossRow.gross) * 100 : 0;

  const averageTicketOverTime = dayRows.map((d) => ({
    date: d.date,
    averageTicket: d.orders > 0 ? Math.round(d.sales / d.orders) : 0,
  }));

  return {
    startDate,
    endDate,
    salesByDay: dayRows,
    salesByDayOfWeek,
    busiestDays,
    slowestDays,
    salesByHour,
    busiestHours,
    slowestHours,
    topItemsByRevenue,
    topItemsByQuantity,
    topCategories,
    refundRate: Math.round(refundRate * 100) / 100,
    discountImpact: Math.round(discountImpact * 100) / 100,
    averageTicketOverTime,
  };
}
