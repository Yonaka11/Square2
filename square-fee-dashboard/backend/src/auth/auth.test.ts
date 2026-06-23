// Unit tests for the auth token signing/verification (pure crypto logic).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken } from './auth.js';

test('a freshly signed token verifies', () => {
  const token = signToken();
  assert.equal(verifyToken(token), true);
});

test('a tampered token fails verification', () => {
  const token = signToken();
  const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
  assert.equal(verifyToken(tampered), false);
});

test('an expired token fails verification', () => {
  const expired = signToken(-1000); // already expired
  assert.equal(verifyToken(expired), false);
});

test('garbage tokens fail verification', () => {
  assert.equal(verifyToken(undefined), false);
  assert.equal(verifyToken(''), false);
  assert.equal(verifyToken('not-a-token'), false);
  assert.equal(verifyToken('a.b.c'), false);
});
