/**
 * Publication gate: the signed registry index must exist and verify.
 *
 * Runs after `scripts/build-listings-index.mjs` and BEFORE any upload/deploy.
 * Fails closed (non-zero exit) when:
 *   - the index, its `.sig` companion or the published public key is missing
 *   - the signature payload is malformed
 *   - the signature does not verify against the published key
 *
 * This is the SIG-01 gate: an unsigned or unverifiable index is never published.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { verifyIndexBytes } from './registry-signing.mjs';

const root = path.resolve(import.meta.dirname, '..');
const registryDir = path.join(root, 'docs', 'public', 'registry');
const indexPath = path.join(registryDir, 'listings.json');
const sigPath = path.join(registryDir, 'listings.json.sig');
const pubPath = path.join(registryDir, 'verification-key.pub');

function fail(message) {
  console.error(`✗ signed index gate FAILED: ${message}`);
  process.exit(1);
}

let index;
let sigRaw;
let publicKeyPem;
try {
  index = readFileSync(indexPath, 'utf8');
} catch {
  fail(`missing ${path.relative(root, indexPath)}`);
}
try {
  sigRaw = readFileSync(sigPath, 'utf8');
} catch {
  fail(`missing ${path.relative(root, sigPath)} — the index was not signed`);
}
try {
  publicKeyPem = readFileSync(pubPath, 'utf8');
} catch {
  fail(`missing ${path.relative(root, pubPath)} — no published verification key`);
}

let sig;
try {
  sig = JSON.parse(sigRaw);
} catch {
  fail(`${path.relative(root, sigPath)} is not valid JSON`);
}

if (!verifyIndexBytes(index, sig, publicKeyPem)) {
  fail('signature does not verify against the published verification key');
}

console.log(`✓ signed index verified (${sig.key_id}) → deploy allowed`);
