/**
 * Listing CI entry (post-merge, spec §6/D16): ensures an immutable
 * discovery Payment Link exists for every registry record that lacks one.
 * Requires LISTING_STRIPE_SECRET_KEY (Actions secret only, §17).
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { ensureDiscoveryLink } from '../src/payments/discovery.js';

const dir = path.resolve('listing');
const files = (await readdir(dir)).filter((file) => file.endsWith('.json') && !file.endsWith('.pr.json'));

for (const file of files) {
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
  };
  await writeFile(full, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`✓ ${file}: discovery link ${link.payment_link_id} (${link.payment_link_url})`);
}
