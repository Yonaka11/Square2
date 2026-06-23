// Unit tests for Square webhook signature verification.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSquareSignature, verifySquareWebhookSignature } from './webhookVerify.js';

const URL = 'https://example.com/api/webhooks/square';
const KEY = 'test_signature_key';
const BODY = JSON.stringify({ type: 'order.created', event_id: 'evt_1' });

test('a correctly computed signature verifies', () => {
  const sig = computeSquareSignature(URL, BODY, KEY);
  assert.equal(verifySquareWebhookSignature(BODY, sig, URL, KEY), true);
});

test('a wrong signature fails', () => {
  assert.equal(verifySquareWebhookSignature(BODY, 'deadbeef', URL, KEY), false);
});

test('a tampered body fails verification', () => {
  const sig = computeSquareSignature(URL, BODY, KEY);
  const tamperedBody = JSON.stringify({ type: 'order.created', event_id: 'evt_HACKED' });
  assert.equal(verifySquareWebhookSignature(tamperedBody, sig, URL, KEY), false);
});

test('missing inputs fail safely', () => {
  assert.equal(verifySquareWebhookSignature(BODY, undefined, URL, KEY), false);
  assert.equal(verifySquareWebhookSignature(BODY, 'x', '', KEY), false);
  assert.equal(verifySquareWebhookSignature(BODY, 'x', URL, ''), false);
});
