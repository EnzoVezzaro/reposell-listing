/**
 * Registry event handler (spec §6 — event-driven registry).
 *
 * Receives a validated `reposell.event/v1` publication event dispatched by
 * the RepoSell publisher and mutates the canonical registry:
 *
 *   listing.created    → write listing/<id>.json + create Discussion
 *   listing.updated    → write listing/<id>.json (replace)
 *   listing.unpublished /
 *   listing.deleted    → remove listing/<id>.json
 *
 * Then regenerates the federation surface:
 *   federation/v1/snapshot.json   full materialized index
 *   federation/v1/events.json     append-only event log
 *
 * Discussions are created on first publish (listing.created) only.
 * Each listing gets its own Discussion thread in the repository.
 */

import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const GITHUB_TOKEN = process.env['GITHUB_TOKEN'] ?? process.env['GH_TOKEN'] ?? '';
const REPO_OWNER = 'EnzoVezzaro';
const REPO_NAME = 'reposell-listing';
const DISCUSSION_CATEGORY = 'Announcements';

const listingDir = path.resolve('listing');
const federationDir = path.resolve('federation/v1');

function fail(reason) {
  console.error(`✗ registry event rejected: ${reason}`);
  process.exit(1);
}

async function githubGraphQL(query, variables = {}) {
  if (!GITHUB_TOKEN) {
    console.warn('• no GITHUB_TOKEN — skipping Discussion creation');
    return null;
  }
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${GITHUB_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length > 0) {
    console.warn(`• GitHub GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`);
    return null;
  }
  return json.data;
}

let cachedDiscussionCategoryId = null;
async function getDiscussionCategoryId() {
  if (cachedDiscussionCategoryId !== null) return cachedDiscussionCategoryId;
  const data = await githubGraphQL(`
    query ($owner: String!, $name: String!, $slug: String!) {
      repository(owner: $owner, name: $name) {
        discussionCategories(first: 10) {
          nodes { id slug name }
        }
      }
    }
  `, { owner: REPO_OWNER, name: REPO_NAME, slug: DISCUSSION_CATEGORY.toLowerCase() });
  const cat = data?.repository?.discussionCategories?.nodes?.find(
    (c) => c.slug === DISCUSSION_CATEGORY.toLowerCase() || c.name.toLowerCase() === DISCUSSION_CATEGORY.toLowerCase(),
  );
  if (cat === undefined) {
    console.warn(`• discussion category "${DISCUSSION_CATEGORY}" not found — skipping Discussion creation`);
    return null;
  }
  cachedDiscussionCategoryId = cat.id;
  return cat.id;
}

async function createDiscussion(title, body) {
  const categoryId = await getDiscussionCategoryId();
  if (categoryId === null) return null;
  const data = await githubGraphQL(`
    mutation ($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: { repositoryId: $repoId, categoryId: $catId, title: $title, body: $body }) {
        discussion { number url }
      }
    }
  `, {
    repoId: (await githubGraphQL(`
      query ($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) { id }
      }
    `, { owner: REPO_OWNER, name: REPO_NAME }))?.repository?.id ?? '',
    catId: categoryId,
    title,
    body,
  });
  return data?.createDiscussion?.discussion ?? null;
}

async function getDiscussionStats(number) {
  const data = await githubGraphQL(`
    query ($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        discussion(number: $number) {
          comments { totalCount }
          reactions { totalCount }
        }
      }
    }
  `, { owner: REPO_OWNER, name: REPO_NAME, number });
  const d = data?.repository?.discussion;
  return {
    comments: d?.comments?.totalCount ?? 0,
    reactions: d?.reactions?.totalCount ?? 0,
  };
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
    // For updates, preserve the existing community/discussion data.
    let existing = {};
    if (action === 'listing.updated' && before.has(`${id}.json`)) {
      existing = before.get(`${id}.json`);
    }

    const enriched = {
      ...payload.record,
      id,
      source: {
        repository: payload.source?.repository ?? payload.record.product.repository,
        sell_path: payload.source?.sell_path ?? '/sell',
        ...(payload.source?.commit !== undefined ? { commit: payload.source.commit } : {}),
      },
      ...(existing.community !== undefined ? { community: existing.community } : {}),
      published_at: new Date().toISOString(),
    };

    // Create a Discussion on first publish (listing.created only).
    if (action === 'listing.created' && GITHUB_TOKEN) {
      const repo = enriched.product?.repository ?? '(unknown)';
      const release = enriched.product?.release ?? '';
      const title = repo.split('/')[1] ?? repo;
      const body = [
        `**${repo}** ${release ? `@ ${release}` : ''} is now listed on the reposell marketplace.`,
        '',
        `- **Sell endpoint**: ${enriched.seller?.sell_url ?? '—'}`,
        `- **Discovery contribution**: ${enriched.listing?.discovery_price?.amount ?? 0} ${enriched.listing?.discovery_price?.currency ?? ''}`,
        '',
        '---',
        '',
        'Ask questions, share feedback, or discuss licensing here.',
        `Buy from the seller's storefront: ${enriched.seller?.sell_url ?? '—'}`,
      ].join('\n');
      const discussion = await createDiscussion(title, body);
      if (discussion !== null) {
        enriched.community = {
          github: {
            repository: `${REPO_OWNER}/${REPO_NAME}`,
            discussion_number: discussion.number,
            discussion_url: discussion.url,
          },
        };
        console.log(`✓ created Discussion #${discussion.number}: ${discussion.url}`);
      }
    }

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
