/**
 * Registry index signing (D11 federation).
 *
 * The official listing signs the EXACT bytes of docs/public/registry/listings.json
 * with the RepoSell official Ed25519 key. The signature file is
 * `listings.json.sig` (self-describing: schema, key id, public key, signature)
 * and the SPKI PEM public key is published to `verification-key.pub` so
 * community listing instances can pin the official key.
 *
 * Canonical source of the signing secret: `LISTING_SIGNING_KEY` (base64 of the
 * 32-byte Ed25519 seed, the format produced by `reposell keys generate`). It
 * lives ONLY in repository Actions secrets — never committed.
 *
 * Signing is the same key format and algorithm (Ed25519) the reposell CLI uses
 * for manifests; only the signed bytes differ (here: the raw published JSON).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_ED25519_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const SIG_SCHEMA = 'reposell-listing-index-sig/v1';

export function base64SeedToPkcs8Pem(seedB64) {
  const seed = Buffer.from(seedB64.trim(), 'base64');
  if (seed.length !== 32) throw new Error('LISTING_SIGNING_KEY must be a base64 32-byte Ed25519 seed');
  const der = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
  const lines = der.toString('base64').match(/.{1,64}/g) ?? [];
  return ['-----BEGIN PRIVATE KEY-----', ...lines, '-----END PRIVATE KEY-----', ''].join('\n');
}

function pkcs8Object(seedB64) {
  const seed = Buffer.from(seedB64.trim(), 'base64');
  if (seed.length !== 32) throw new Error('LISTING_SIGNING_KEY must be a base64 32-byte Ed25519 seed');
  return createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]), format: 'der', type: 'pkcs8' });
}

function spkiPemFromPrivate(pkcs8Pem) {
  return createPublicKey(pkcs8Pem).export({ type: 'spki', format: 'pem' });
}

export function rawPublicKeyFromPem(pem) {
  const base64 = pem
    .split(/\r?\n/)
    .filter((line) => line.length > 0 && !line.startsWith('-----'))
    .join('');
  const der = Buffer.from(base64, 'base64');
  if (der.length !== SPKI_ED25519_PREFIX.length + 32 || !der.subarray(0, SPKI_ED25519_PREFIX.length).equals(SPKI_ED25519_PREFIX)) {
    throw new Error('Not an Ed25519 SubjectPublicKeyInfo PEM');
  }
  return der.subarray(SPKI_ED25519_PREFIX.length);
}

/** Signs the exact bytes of a registry index. Returns the signature payload. */
export async function signIndexBytes(indexBytes, seedB64) {
  const privateKey = pkcs8Object(seedB64);
  const publicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).subarray(SPKI_ED25519_PREFIX.length);
  const keyId = 'key_' + createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
  const signature = Buffer.from(
    sign(null, Buffer.from(indexBytes, 'utf8'), privateKey),
  ).toString('base64url');
  return {
    schema: SIG_SCHEMA,
    key_id: keyId,
    public_key: publicKey.toString('base64'),
    signature,
  };
}

/** Verifies a signature payload against the exact served index bytes. */
export function verifyIndexBytes(indexBytes, sigPayload, expectedPublicKeyPem) {
  if (sigPayload?.schema !== SIG_SCHEMA) return false;
  if (typeof sigPayload.signature !== 'string' || typeof sigPayload.public_key !== 'string') return false;
  try {
    const embedded = Buffer.from(sigPayload.public_key, 'base64');
    if (embedded.length !== 32) return false;
    if (expectedPublicKeyPem !== undefined) {
      const expected = rawPublicKeyFromPem(expectedPublicKeyPem);
      if (!expected.equals(embedded)) return false;
    }
    const publicKey = createPublicKey({ key: Buffer.concat([SPKI_ED25519_PREFIX, embedded]), format: 'der', type: 'spki' });
    const signature = Buffer.from(sigPayload.signature, 'base64url');
    return verify(null, Buffer.from(indexBytes, 'utf8'), publicKey, signature);
  } catch {
    return false;
  }
}

/** Loads the published public key PEM and validates it. */
export function readVerificationKeyPem(filePath) {
  return readFileSync(filePath, 'utf8');
}

/** CLI entry: signs the built index when a key is available (CI secret). */
export function main() {
  const root = path.resolve(import.meta.dirname, '..');
  const indexFile = path.join(root, 'docs', 'public', 'registry', 'listings.json');
  const index = readFileSync(indexFile, 'utf8');

  const seed = process.env['LISTING_SIGNING_KEY'];
  if (seed === undefined || seed === '') {
    console.log('✗ no LISTING_SIGNING_KEY — registry index NOT signed (set the Actions secret to enable)');
    return;
  }

  const sig = signIndexBytes(index, seed);
  writeFileSync(indexFile + '.sig', JSON.stringify(sig, null, 2) + '\n');
  writeFileSync(
    path.join(path.dirname(indexFile), 'verification-key.pub'),
    spkiPemFromPrivate(base64SeedToPkcs8Pem(seed)),
  );
  console.log(`✓ signed registry index (${sig.key_id}) → listings.json.sig`);
}