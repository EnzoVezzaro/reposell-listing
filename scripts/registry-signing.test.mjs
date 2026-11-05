import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

/** Temp registry dir pre-seeded with the fixture index (no signature). */
function signedFixtureDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'reposell-sign-'));
  writeFileSync(path.join(dir, 'listings.json'), INDEX_TEXT);
  return dir;
}

/** Temp registry dir used for the local no-op path; nothing is written to it. */
function emptyRegistryDir() {
  return signedFixtureDir();
}

describe('registry index signing (D11)', () => {
  it('signs and verifies the exact index bytes SAFETY: standard sign-verify round-trip', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    expect(sig.schema).toBe('reposell-listing-index-sig/v1');
    expect(sig.key_id).toMatch(/^key_[0-9a-f]{16}$/);
    expect(Buffer.from(sig.public_key, 'base64').length).toBe(32);
    expect(verifyIndexBytes(INDEX_TEXT, sig)).toBe(true);
  });

  it('verifies against a pinned official public key SAFETY: pinned key verification', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    expect(verifyIndexBytes(INDEX_TEXT, sig, spkiPem)).toBe(true);
  });

  it('rejects a tampered index SAFETY: tampered bytes fail verification', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    const tampered = INDEX_TEXT.replace('v1.0.0', 'v9.9.9');
    expect(verifyIndexBytes(tampered, sig)).toBe(false);
  });

  it('rejects a wrong pinned key SAFETY: mismatched public key fails', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    expect(verifyIndexBytes(INDEX_TEXT, sig, other)).toBe(false);
  });

  it('rejects unknown signature schemas SAFETY: bad schema rejected', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    expect(verifyIndexBytes(INDEX_TEXT, { ...sig, schema: 'other/v1' })).toBe(false);
  });

  it('rejects malformed signatures SAFETY: bad signature string rejected', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    expect(verifyIndexBytes(INDEX_TEXT, { ...sig, signature: '!not-base64url!' })).toBe(false);
  });

  it('enforces a 32-byte seed SAFETY: short seed throws', () => {
    expect(() => base64SeedToPkcs8Pem(Buffer.from('short').toString('base64'))).toThrow(/32-byte/);
  });

  it('round-trips the published PEM public key to raw bytes SAFETY: PEM to raw round-trip', () => {
    const raw = rawPublicKeyFromPem(spkiPem);
    expect(raw.length).toBe(32);
  });

  it('local informational mode: skips signing without the secret SAFETY: no-throw when no key, local use only', async () => {
    const had = Object.prototype.hasOwnProperty.call(process.env, 'LISTING_SIGNING_KEY');
    const saved = process.env['LISTING_SIGNING_KEY'];
    delete process.env['LISTING_SIGNING_KEY'];
    const dir = emptyRegistryDir();
    try {
      // in non-required mode main() is a no-op and must not throw
      await expect(main({ registryDir: dir })).resolves.toBeUndefined();
    } finally {
      if (had) process.env['LISTING_SIGNING_KEY'] = saved;
      else delete process.env['LISTING_SIGNING_KEY'];
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('required mode: no secret throws SAFETY: required mode rejects when LISTING_SIGNING_KEY absent', async () => {
    const had = Object.prototype.hasOwnProperty.call(process.env, 'LISTING_SIGNING_KEY');
    const saved = process.env['LISTING_SIGNING_KEY'];
    delete process.env['LISTING_SIGNING_KEY'];
    const dir = signedFixtureDir();
    try {
      await expect(main({ requireSigning: true, registryDir: dir })).rejects.toThrow(/required but not set/);
    } finally {
      if (had) process.env['LISTING_SIGNING_KEY'] = saved;
      else delete process.env['LISTING_SIGNING_KEY'];
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('required mode: malformed seed throws SAFETY: required mode throws on bad base64 length', async () => {
    const had = Object.prototype.hasOwnProperty.call(process.env, 'LISTING_SIGNING_KEY');
    const saved = process.env['LISTING_SIGNING_KEY'];
    process.env['LISTING_SIGNING_KEY'] = 'not-base64-or-32-bytes!!!';
    const dir = signedFixtureDir();
    try {
      await expect(main({ requireSigning: true, registryDir: dir })).rejects.toThrow(/malformed/);
    } finally {
      if (had) process.env['LISTING_SIGNING_KEY'] = saved;
      else delete process.env['LISTING_SIGNING_KEY'];
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Regression: main() used to be sync and therefore serialized the un-awaited
  // Promise from signIndexBytes as `{}` — an invalid signature even with a valid
  // secret. This exercises the REAL CLI entrypoint, not the primitives.
  it('main() writes a verifiable .sig and public key through the real entrypoint SAFETY: full sign-verify cycle', async () => {
    const dir = signedFixtureDir();
    const had = Object.prototype.hasOwnProperty.call(process.env, 'LISTING_SIGNING_KEY');
    const saved = process.env['LISTING_SIGNING_KEY'];
    process.env['LISTING_SIGNING_KEY'] = seedB64;
    try {
      await main({ requireSigning: true, registryDir: dir });
      const sigFile = path.join(dir, 'listings.json.sig');
      const pubFile = path.join(dir, 'verification-key.pub');
      const readSig = JSON.parse(readFileSync(sigFile, 'utf8'));
      const readPub = readFileSync(pubFile, 'utf8');
      // the signature payload must be a real one, not the `{}` regression
      expect(readSig.schema).toBe('reposell-listing-index-sig/v1');
      expect(readSig.key_id).toMatch(/^key_[0-9a-f]{16}$/);
      expect(verifyIndexBytes(INDEX_TEXT, readSig, readPub)).toBe(true);
    } finally {
      if (had) process.env['LISTING_SIGNING_KEY'] = saved;
      else delete process.env['LISTING_SIGNING_KEY'];
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('index tampered after signing makes verification fail SAFETY: tampered index vs original sig', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    const tampered = INDEX_TEXT.replace('v1.0.0', 'v9.9.9');
    expect(verifyIndexBytes(tampered, sig)).toBe(false);
  });

  it('verification fails when the wrong public key is supplied SAFETY: wrong pinned key rejected', async () => {
    const sig = await signIndexBytes(INDEX_TEXT, seedB64);
    const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    expect(verifyIndexBytes(INDEX_TEXT, sig, other)).toBe(false);
  });
});