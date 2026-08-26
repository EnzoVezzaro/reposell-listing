/**
 * Registry event handler (spec §6 — event-driven registry).
 *
 * Receives a validated `reposell.event/v1` publication event dispatched by
 * the RepoSell publisher and mutates the canonical registry:
 *
 *   listing.created    → write listing/<id>.json
 *   listing.updated    → write listing/<id>.json (replace)
 *   listing.unpublished /
 *   listing.deleted    → remove listing/<id>.json
 *
 * Then regenerates the federation surface:
 *   federation/v1/snapshot.json   full materialized index
 *   federation/v1/events.json     append-only event log
 *
 * This script is intentionally dumb: it trusts the event envelope (the
 * dispatcher is the RepoSell publisher) and only validates shape.
 */

import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const listingDir = path.resolve('listing');
const federationDir = path.resolve('federation/v1');

function fail(reason) {
  console.error(`✗ registry event rejected: ${reason}`);
  process.exit(1);
}

async function readPayload() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (text.length === 0) fail('empty event payload on stdin');
  try {
    return JSON.parse(text);
  } catch {
    fail('payload is not valid JSON');
  }
}

function validate(event) {
  if (event.schema !== 'reposell.event/v1') fail(`schema must be reposell.event/v1 (got ${event.schema})`);
  const known = ['listing.created', 'listing.updated', 'listing.unpublished', 'listing.deleted'];
  if (!known.includes(event.event)) fail(`unknown event "${event.event}"`);
  if (typeof event.listing?.id !== 'string' || !/^lst_[A-Za-z0-9]+$/.test(event.listing.id)) {
    fail('listing.id must match lst_<base36>');
  }
  if (event.event === 'listing.unpublished' || event.event === 'listing.deleted') return;

  const record = event.record;
  if (record === undefined || record === null || typeof record !== 'object') fail('missing record');
  if (record.schema !== 'reposell-listing-record/v1') fail('record.schema must be reposell-listing-record/v1');
  if (typeof record.product?.repository !== 'string' || record.product.repository.length === 0) {
    fail('record.product.repository required');
  }
  if (typeof record.product?.release !== 'string' || record.product.release.length === 0) {
    fail('record.product.release required');
  }
  if (!/^https:\/\/(buy|checkout)\.stripe\.com\//.test(record.seller?.payment_link ?? '')) {
    fail('record.seller.payment_link must be a Stripe Payment Link');
  }
  if (!(record.listing?.discovery_price?.amount > 0)) fail('record.listing.discovery_price.amount must be positive');
}

async function currentRecords() {
  let files = [];
  try {
    files = (await readdir(listingDir)).filter((f) => f.endsWith('.json'));
  } catch {
    return new Map();
  }
  const map = new Map();
  for (const file of files) {
    try {
      map.set(file, JSON.parse(await readFile(path.join(listingDir, file), 'utf8')));
    } catch {
      // Unreadable entries are skipped, never crash the registry.
    }
  }
  return map;
}

async function writeJson(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

async function regenerateFederation(recordsById, log) {
  await mkdir(federationDir, { recursive: true });

  const records = [...recordsById.values()];
  const snapshot = `${JSON.stringify({ schema: 'reposell.federation-snapshot/v1', updated_at: new Date().toISOString(), listings: records }, null, 2)}\n`;

  let events = [];
  try {
    const existing = JSON.parse(await readFile(path.join(federationDir, 'events.json'), 'utf8'));
    events = Array.isArray(existing.events) ? existing.events : [];
  } catch {
    events = [];
  }
  events.push(...log);
  // Append-only log, newest last; hard cap keeps the file bounded.
  const logJson = `${JSON.stringify({ schema: 'reposell.federation-events/v1', events: events.slice(-500) }, null, 2)}\n`;

  // Canonical copies live in-repo; the docs build publishes the same files
  // so federation consumers pull them from listing.reposell.dev.
  for (const base of [federationDir, path.resolve('docs/public/federation/v1')]) {
    await mkdir(base, { recursive: true });
    await writeJson(path.join(base, 'snapshot.json'), snapshot);
    await writeJson(path.join(base, 'events.json'), logJson);
  }
}

async function main() {
  const payload = await readPayload();
  validate(payload);

  const id = payload.listing.id;
  const recordFile = path.join(listingDir, `${id}.json`);

  // Existing registry state (for the federation log + update semantics).
  const before = await currentRecords();

  let action = payload.event;
  if (payload.event === 'listing.created' && before.has(`${id}.json`)) {
    action = 'listing.updated'; // same stable id re-announced — treat as update
  }

  if (action === 'listing.deleted' || action === 'listing.unpublished') {
    try {
      await unlink(recordFile);
      console.log(`✓ removed ${id}.json`);
    } catch {
      console.log(`• ${id}.json already absent`);
    }
  } else {
    const enriched = {
      ...payload.record,
      id,
      source: {
        repository: payload.source?.repository ?? payload.record.product.repository,
        sell_path: payload.source?.sell_path ?? '/sell',
        ...(payload.source?.commit !== undefined ? { commit: payload.source.commit } : {}),
      },
      published_at: new Date().toISOString(),
    };
    await mkdir(listingDir, { recursive: true });
    await writeJson(recordFile, `${JSON.stringify(enriched, null, 2)}\n`);
    console.log(`✓ wrote ${id}.json (${action})`);
  }

  const after = await currentRecords();
  await regenerateFederation(after, [
    {
      schema: 'reposell.event/v1',
      event: action,
      listing: { id },
      timestamp: new Date().toISOString(),
      actor: payload.source?.repository,
    },
  ]);
  console.log(`✓ federation regenerated — ${after.size} listing(s) in the canonical index`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
