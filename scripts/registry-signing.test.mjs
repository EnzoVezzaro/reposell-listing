import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

import {
  base64SeedToPkcs8Pem,
  main,
  rawPublicKeyFromPem,
  signIndexBytes,
  verifyIndexBytes,
} from './registry-signing.mjs';

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

function seedFromKeypair(privateKey) {
  const der = privateKey.export({ type: 'pkcs8', format: 'der' });
  return der.subarray(PKCS8_ED25519_PREFIX.length).toString('base64');
}

const keypair = generateKeyPairSync('ed25519');
const seedB64 = seedFromKeypair(keypair.privateKey);
const spkiPem = keypair.publicKey.export({ type: 'spki', format: 'pem' });

const INDEX_TEXT = JSON.stringify({
  updated: '2026-09-08T00:00:00.000Z',
  listings: [{ repository: 'seller/project', release: 'v1.0.0' }],
});

describe('registry index signing (D11)', () => {
  it('signs and verifies the exact index bytes', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    expect(sig.schema).toBe('reposell-listing-index-sig/v1');
    expect(sig.key_id).toMatch(/^key_[0-9a-f]{16}$/);
    expect(Buffer.from(sig.public_key, 'base64').length).toBe(32);
    expect(verifyIndexBytes(INDEX_TEXT, sig)).toBe(true);
  });

  it('verifies against a pinned official public key', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    expect(verifyIndexBytes(INDEX_TEXT, sig, spkiPem)).toBe(true);
  });

  it('rejects a tampered index', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    const tampered = INDEX_TEXT.replace('v1.0.0', 'v9.9.9');
    expect(verifyIndexBytes(tampered, sig)).toBe(false);
  });

  it('rejects a wrong pinned key', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    expect(verifyIndexBytes(INDEX_TEXT, sig, other)).toBe(false);
  });

  it('rejects unknown signature schemas', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    expect(verifyIndexBytes(INDEX_TEXT, { ...sig, schema: 'other/v1' })).toBe(false);
  });

  it('rejects malformed signatures', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    expect(verifyIndexBytes(INDEX_TEXT, { ...sig, signature: '!not-base64url!' })).toBe(false);
  });

  it('enforces a 32-byte seed', () => {
    expect(() => base64SeedToPkcs8Pem(Buffer.from('short').toString('base64'))).toThrow(/32-byte/);
  });

  it('round-trips the published PEM public key to raw bytes', () => {
    const raw = rawPublicKeyFromPem(spkiPem);
    expect(raw.length).toBe(32);
  });

  it('skips signing without the secret (no-op, no throw)', () => {
    const had = Object.prototype.hasOwnProperty.call(process.env, 'LISTING_SIGNING_KEY');
    const saved = process.env['LISTING_SIGNING_KEY'];
    delete process.env['LISTING_SIGNING_KEY'];
    try {
      expect(() => main()).not.toThrow();
    } finally {
      if (had) process.env['LISTING_SIGNING_KEY'] = saved;
    }
  });
});