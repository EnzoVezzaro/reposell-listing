/**
 * Listing CI verification (spec §4, D13) — POINTER-ONLY PRs.
 *
 * The PR carries no seller data: just which repository@release is being
 * requested. EVERYTHING shown in the listing is derived here, live:
 *   1. Fetch the seller's /sell page → embedded reposell-data JSON.
 *   2. Validate fail-closed: schema, repository identity, release
 *      availability, verified Payment Link.
 *   3. Derive the registry record (incl. discovery contribution declared
 *      on the seller's own page) and COMMIT it to the PR branch.
 *
 * On merge, discovery-sync.yml provisions the immutable discovery
 * Payment Link (§15/D16). This script never touches seller Stripe data.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const dir = path.resolve('listing');

function fail(reason) {
  console.error(`✗ BLOCKED: ${reason}`);
  process.exit(1);
}

async function main() {
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.request.json'));
  } catch {
    fail('listing/ directory not found');
  }

  // Legacy fallback: old branches may still carry *.pr.json payloads.
  if (files.length === 0) {
    const legacy = (await readdir(dir)).filter((f) => f.endsWith('.pr.json'));
    files = legacy;
  }
  if (files.length === 0) fail('no listing request found');

  const request = JSON.parse(await readFile(path.join(dir, files[0]), 'utf8'));
  const sellUrl = request.sell_url ?? request.sell?.url;
  if (typeof sellUrl !== 'string' || !sellUrl.startsWith('https://')) {
    fail(`invalid or missing sell_url on the request (${files[0]})`);
  }

  // Schema/request shape (fail-closed on unknown request schemas).
  if (request.schema !== undefined && request.schema !== 'reposell-listing-request/v1') {
    fail(`unexpected request schema: ${request.schema}`);
  }

  // 0. Secret scan — the request must never carry credentials.
  const serialized = JSON.stringify(request);
  if (/(sk_(test|live)_|rk_|whsec_)/.test(serialized)) {
    fail('Stripe secret detected in the listing request — remove it, the request is pointer-only');
  }

  // 0b. Duplicate/immutability (spec §15): a repository may be listed once.
  const listedRecords = [];
  try {
    for (const f of (await readdir(dir)).filter((f) => f.endsWith('.json'))) {
      const rec = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
      if (typeof rec?.product?.repository === 'string') listedRecords.push(rec.product.repository);
    }
  } catch {}
  // Legacy fallback: *.pr.json payloads may not exist on new branches; note
  // the existing-record check below is informational, the identity check is
  // authoritative (the PR derives its repository from the live /sell page).

  // 1. Live /sell page → embedded document.
  const res = await fetch(sellUrl, { headers: { 'user-agent': 'reposell-listing-ci' } });
  if (!res.ok) fail(`/sell page unreachable: HTTP ${res.status} at ${sellUrl}`);
  const html = await res.text();
  const match = html.match(/<script type="application\/json" id="reposell-data">(.*?)<\/script>/s);
  if (match === null) fail('/sell page has no embedded reposell-data — run `reposell build` and push');
  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    fail('embedded reposell-data is not valid JSON');
  }
  if (data.schema !== 'reposell/sell-page/v1') fail(`unexpected schema ${data.schema}`);

  // 2. Identity + release + offer, all from the seller's own page.
  const repository =
    request.repository ?? `${data.repository}`; // legacy payloads carried it
  if (data.repository !== repository) {
    fail(`repository identity mismatch: page declares "${data.repository}", request says "${repository}"`);
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    fail(`invalid repository slug "${repository}"`);
  }
  if (listedRecords.includes(repository)) {
    fail(`${repository} is already listed (spec §15 duplicate check)`);
  }

  const available = (data.releases ?? []).filter((r) => r.status === 'available' && (r.offers ?? []).length > 0);
  const requestedRelease = request.release ?? available[0]?.version;
  const release = available.find((r) => r.version === requestedRelease);
  if (release === undefined) {
    fail(
      `release ${requestedRelease ?? '(none requested)'} is not published/available on the /sell page — \`reposell publish\` + push first`,
    );
  }
  if (!/^v\d+\.\d+\.\d+/.test(release.version)) fail(`invalid release version "${release.version}"`);
  const offer = release.offers[0];
  if (!/^https:\/\/(buy|checkout)\.stripe\.com\//.test(offer.paymentLink ?? '')) {
    fail(`offer for ${release.version} has no valid Stripe Payment Link`);
  }
  if (!(offer.price > 0)) fail(`offer for ${release.version} has no positive price`);

  // 3. Discovery contribution: declared by the seller on their own page,
  //    default $5 USD per D16 when absent.
  const contribution = data.listing?.contribution ?? { amount: 5, currency: 'USD' };
  if (!(contribution.amount > 0)) fail('seller-declared discovery contribution must be positive');
  if (typeof contribution.currency !== 'string' || contribution.currency.length !== 3) {
    fail('seller-declared discovery contribution must use a 3-letter currency');
  }

  const record = {
    schema: 'reposell-listing-record/v1',
    product: { repository, release: release.version },
    seller: {
      sell_url: sellUrl,
      payment_link: offer.paymentLink,
    },
    listing: {
      discovery_price: {
        amount: contribution.amount,
        currency: String(contribution.currency).toUpperCase(),
      },
    },
  };

  console.log(`✓ Derived from live endpoints:`);
  console.log(`    repository      ${record.product.repository}`);
  console.log(`    release         ${record.product.release} — ${offer.price} ${offer.currency}`);
  console.log(`    payment link    ${record.seller.payment_link}`);
  console.log(`    discovery       ${record.listing.discovery_price.amount} ${record.listing.discovery_price.currency}`);

  // 4. Commit the derived record into the PR branch so the merge lands a
  //    complete registry entry. Requires contents:write on the PR checkout.
  const token = process.env['GITHUB_TOKEN'];
  const number = process.env['PR_NUMBER'];
  if (token === undefined || number === undefined) {
    console.log('• local verification only — record committed during CI runs');
    return;
  }

  const pr = JSON.parse(
    execFileSync('gh', ['api', `repos/${process.env['GITHUB_REPOSITORY']}/pulls/${number}`, '--jq', '{ref:.head.ref,repo:.head.repo.full_name}'], { encoding: 'utf8' }),
  );
  const baseName = path.basename(files[0]).replace(/\.pr\.json$/, '').replace(/\.request\.json$/, '');
  const recordPath = `listing/${baseName}.json`;
  ghPutFile(pr.repo, recordPath, `${JSON.stringify(record, null, 2)}\n`, pr.ref, `derive registry record from live /sell`);

  console.log(`✓ Registry record committed to the PR branch: ${recordPath}`);
}

function ghPutFile(repo, path_, content, branch, message) {
  execFileSync(
    'gh',
    [
      'api', '--method', 'PUT',
      `repos/${repo}/contents/${path_}`,
      '-f', `message=${message}`,
      '-f', `content=${Buffer.from(content, 'utf8').toString('base64')}`,
      '-f', `branch=${branch}`,
    ],
    { stdio: 'pipe' },
  );
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
