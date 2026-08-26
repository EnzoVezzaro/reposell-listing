/**
 * Builds docs/public/registry/listings.json from the registry records in
 * listing/*.json so the static site can render the connected-listings
 * directory without any server. Missing/empty registry → empty index.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const registryDir = path.join(root, 'listing');
const outFile = path.join(root, 'docs', 'public', 'registry', 'listings.json');

let entries = [];
try {
  const files = (await readdir(registryDir)).filter((file) => file.endsWith('.json') && !file.endsWith('.pr.json'));
  entries = await Promise.all(
    files.sort().map(async (file) => {
      const record = JSON.parse(await readFile(path.join(registryDir, file), 'utf8'));
      return {
        repository: record.product?.repository ?? '(unknown)',
        release: record.product?.release ?? '(unknown)',
        sell_url: record.seller?.sell_url ?? '',
        payment_link: record.seller?.payment_link ?? '',
        amount: record.listing?.discovery_price?.amount ?? null,
        currency: record.listing?.discovery_price?.currency ?? '',
      };
    }),
  );
} catch {
  // no listing/ directory yet — publish an empty directory index
}

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify({ updated: new Date().toISOString(), listings: entries }, null, 2)}\n`);
console.log(`registry index: ${entries.length} listing(s) → docs/public/registry/listings.json`);
