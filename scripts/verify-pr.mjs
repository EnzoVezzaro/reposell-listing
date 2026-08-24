/**
 * Listing CI entry: verify a PR payload fail-closed (spec §4).
 * Usage: node scripts/verify-pr.mjs <path-to.pr.json>
 * Exit 1 = BLOCKED. No Stripe secret is required or accepted here (§17).
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { verifyListingPr } from '../src/verify/pipeline.js';

async function loadRegistry() {
  const dir = path.resolve('listing');
  const records = [];
  try {
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.json') || file.endsWith('.pr.json')) continue;
      try {
        records.push(JSON.parse(await readFile(path.join(dir, file), 'utf8')));
      } catch {
        /* skip malformed */
      }
    }
  } catch {
    /* no registry yet */
  }
  const listedRepositories = [...new Set(records.map((record) => record.product?.repository).filter(Boolean))];
  const map = {};
  for (const record of records) {
    map[`${record.product?.repository}@${record.product?.release}`] = {
      discoveryPaymentLinkId: record.listing?.stripe?.payment_link_id ?? 'unknown',
    };
  }
  return { listedRepositories, records: map };
}

if (process.env['LISTING_STRIPE_SECRET_KEY'] !== undefined) {
  console.error('✗ LISTING_STRIPE_SECRET_KEY must not be set during verification (§17).');
  process.exit(1);
}

const prPath = process.argv[2];
if (prPath === undefined) {
  console.error('usage: node scripts/verify-pr.mjs <payload.pr.json>');
  process.exit(1);
}

const pr = JSON.parse(await readFile(prPath, 'utf8'));
const registry = await loadRegistry();
const report = await verifyListingPr({ pr, registry, fetchImpl: (url) => fetch(url).then((res) => ({ ok: res.ok, status: res.status, text: () => res.text() })) });

for (const step of report.steps) {
  console.log(`${step.ok ? '✓' : '✗'} ${step.step}: ${step.detail}`);
}
console.log(`\nverdict: ${report.verdict}`);
if (report.verdict === 'BLOCKED') process.exit(1);
