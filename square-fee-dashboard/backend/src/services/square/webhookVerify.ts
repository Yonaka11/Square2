// Square webhook signature verification (pure, unit-testable).
// Square signs notifications with HMAC-SHA256 over (notificationUrl + rawBody)
// using your webhook signature key, base64-encoded, sent in the
// `x-square-hmacsha256-signature` header.
// Docs: https://developer.squareup.com/docs/webhooks/step3validate
import crypto from 'node:crypto';

export function computeSquareSignature(
  notificationUrl: string,
  rawBody: string,
  signatureKey: string
): string {
  return crypto.createHmac('sha256', signatureKey).update(notificationUrl + rawBody).digest('base64');
}

export function verifySquareWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined | null,
  notificationUrl: string,
  signatureKey: string
): boolean {
  if (!signatureHeader || !signatureKey || !notificationUrl) return false;
  const expected = computeSquareSignature(notificationUrl, rawBody, signatureKey);
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
