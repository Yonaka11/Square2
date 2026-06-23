import { Router } from 'express';
import type { Request } from 'express';
import { db } from '../db/database.js';
import { verifySquareWebhookSignature } from '../services/square/webhookVerify.js';

export const webhooksRouter = Router();

// POST /api/webhooks/square -> receive a Square webhook notification.
// Verifies the HMAC signature (when a signature key + URL are configured),
// records the event, and acknowledges. Actual data refresh is left to manual
// sync in v1 (a future enhancement can trigger incremental sync here).
webhooksRouter.post('/square', (req: Request & { rawBody?: Buffer }, res) => {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? '';
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL ?? '';
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body ?? {});
  const signatureHeader = req.header('x-square-hmacsha256-signature');

  // If a signature key is configured, enforce verification; otherwise accept
  // (useful for local testing) but mark the event as unverified.
  let signatureValid = false;
  if (signatureKey && notificationUrl) {
    signatureValid = verifySquareWebhookSignature(rawBody, signatureHeader, notificationUrl, signatureKey);
    if (!signatureValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  const body = req.body ?? {};
  db.prepare(
    `INSERT INTO webhook_events (event_id, event_type, merchant_id, signature_valid, payload, received_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    body.event_id ?? null,
    body.type ?? null,
    body.merchant_id ?? null,
    signatureValid ? 1 : 0,
    rawBody,
    new Date().toISOString()
  );

  res.status(200).json({ status: 'received' });
});

// GET /api/webhooks/recent -> last 20 received webhook events (for the UI)
webhooksRouter.get('/recent', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, event_id AS eventId, event_type AS eventType, merchant_id AS merchantId,
              signature_valid AS signatureValid, received_at AS receivedAt
       FROM webhook_events ORDER BY received_at DESC LIMIT 20`
    )
    .all();
  res.json(rows);
});
