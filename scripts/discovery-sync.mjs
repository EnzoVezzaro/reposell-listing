/**
 * Listing CI entry (post-merge, spec §6/D16):
 *   1. PROMOTE every merged listing/*.pr.json payload into its canonical
 *      registry record (listing/<owner>--<name>.json) — fail-closed.
 *   2. Ensure an immutable discovery Payment Link exists for every registry
 *      record that lacks one.
 * Requires LISTING_STRIPE_SECRET_KEY when records still lack links
 * (Actions secret only, §17).
 */

import { readFile, readdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { ensureDiscoveryLink } from '../src/payments/discovery.js';
import { promotePrPayload, canonicalFileName, PromotionError } from '../src/registry/promote.js';

const dir = path.resolve('listing');
let files = [];
try {
  files = await readdir(dir);
} catch {
  // No registry directory yet — nothing to provision, still a success so
  // scheduled/manual runs stay green before the first Listing PR merges.
  console.log('listing/ not found — no registry records to provision.');
  process.exit(0);
}

// ── Phase 1: promote merged PR payloads into canonical registry records ──
const prFiles = files.filter((file) => file.endsWith('.pr.json'));
for (const file of prFiles) {
  const full = path.join(dir, file);
  let raw;
  try {
    raw = JSON.parse(await readFile(full, 'utf8'));
  } catch (error) {
    console.error(`✗ ${file}: unreadable payload (${error instanceof Error ? error.message : error})`);
    process.exit(1);
  }
  try {
    const record = promotePrPayload(raw);
    const fileName = canonicalFileName(record.product.repository);
    const target = path.join(dir, fileName);
    let existing;
    try {
      existing = JSON.parse(await readFile(target, 'utf8'));
    } catch {
      /* target absent — fresh promotion */
    }
    if (existing !== undefined) {
      throw new PromotionError(
        `${fileName} already exists — refusing to overwrite an immutable registry record (§15)`,
      );
    }
    await writeFile(target, `${JSON.stringify(record, null, 2)}\n`);
    await rm(full);
    console.log(`✓ promoted ${file} → ${path.basename(target)} (${record.product.repository}@${record.product.release})`);
  } catch (error) {
    console.error(`✗ ${file}: promotion failed — ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// ── Phase 2: provision immutable discovery links for unprovisioned records ──
const refreshed = (await readdir(dir)).filter((file) => file.endsWith('.json') && !file.endsWith('.pr.json'));

for (const file of refreshed) {
  const full = path.join(dir, file);
  const record = JSON.parse(await readFile(full, 'utf8'));
  if (record.listing?.stripe?.payment_link_id !== undefined) continue; // immutable, already provisioned

  const apiKey = process.env['LISTING_STRIPE_SECRET_KEY'];
  if (apiKey === undefined) {
    console.error('✗ LISTING_STRIPE_SECRET_KEY missing — cannot provision discovery links.');
    process.exit(1);
  }

  const link = await ensureDiscoveryLink({
    apiKey,
    input: {
      repository: record.product.repository,
      release: record.product.release,
      amount: record.listing.discovery_price.amount,
      currency: record.listing.discovery_price.currency,
      baseUrl: 'https://listing.reposell.dev',
    },
    fetchImpl: (url, init) =>
      fetch(url, init).then((res) => ({
        ok: res.ok,
        status: res.status,
        json: () => res.json(),
      })),
  });

  record.listing.stripe = {
    payment_link_id: link.payment_link_id,
    price_id: link.price_id,
    product_id: link.product_id,
    payment_link_url: link.payment_link_url,
  };
  await writeFile(full, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`✓ ${file}: discovery link ${link.payment_link_id} (${link.payment_link_url})`);
}
