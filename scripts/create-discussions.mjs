/**
 * Creates GitHub Discussions for listing records that lack a community.discussion
 * field. Runs after discovery-sync to ensure every published listing has a
 * Discussion thread for buyer community engagement.
 *
 * Idempotent: skips listings that already have a Discussion.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const GITHUB_TOKEN = process.env['GITHUB_TOKEN'] ?? '';
const REPO_OWNER = 'EnzoVezzaro';
const REPO_NAME = 'reposell-listing';
const DISCUSSION_CATEGORY = 'Announcements';

const listingDir = path.resolve('listing');

if (!GITHUB_TOKEN) {
  console.log('• no GITHUB_TOKEN — skipping Discussion creation');
  process.exit(0);
}

async function githubGraphQL(query, variables = {}) {
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
    console.warn(`• discussion category "${DISCUSSION_CATEGORY}" not found`);
    return null;
  }
  cachedDiscussionCategoryId = cat.id;
  return cat.id;
}

let cachedRepoId = null;
async function getRepoId() {
  if (cachedRepoId !== null) return cachedRepoId;
  const data = await githubGraphQL(`
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { id }
    }
  `, { owner: REPO_OWNER, name: REPO_NAME });
  cachedRepoId = data?.repository?.id ?? null;
  return cachedRepoId;
}

async function createDiscussion(title, body) {
  const categoryId = await getDiscussionCategoryId();
  const repoId = await getRepoId();
  if (categoryId === null || repoId === null) return null;
  const data = await githubGraphQL(`
    mutation ($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: { repositoryId: $repoId, categoryId: $catId, title: $title, body: $body }) {
        discussion { number url }
      }
    }
  `, { repoId, catId: categoryId, title, body });
  return data?.createDiscussion?.discussion ?? null;
}

// Load all listing records
let files = [];
try {
  files = (await readdir(listingDir)).filter((f) => f.endsWith('.json'));
} catch {
  console.log('• listing/ directory not found — nothing to do');
  process.exit(0);
}

let created = 0;
for (const file of files) {
  const fullPath = path.join(listingDir, file);
  let record;
  try {
    record = JSON.parse(await readFile(fullPath, 'utf8'));
  } catch {
    continue;
  }

  // Skip listings that already have a Discussion
  if (record.community?.github?.discussion_number) continue;

  const repo = record.product?.repository ?? '(unknown)';
  const release = record.product?.release ?? '';
  const title = repo.split('/')[1] ?? repo;
  const body = [
    `**${repo}** ${release ? `@ ${release}` : ''} is now listed on the reposell marketplace.`,
    '',
    `- **Sell endpoint**: ${record.seller?.sell_url ?? '—'}`,
    `- **Discovery contribution**: ${record.listing?.discovery_price?.amount ?? 0} ${record.listing?.discovery_price?.currency ?? ''}`,
    '',
    '---',
    '',
    'Ask questions, share feedback, or discuss licensing here.',
    `Buy from the seller's storefront: ${record.seller?.sell_url ?? '—'}`,
  ].join('\n');

  const discussion = await createDiscussion(title, body);
  if (discussion !== null) {
    record.community = {
      github: {
        repository: `${REPO_OWNER}/${REPO_NAME}`,
        discussion_number: discussion.number,
        discussion_url: discussion.url,
      },
    };
    await writeFile(fullPath, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`✓ ${file}: created Discussion #${discussion.number}`);
    created++;
  }
}

if (created === 0) {
  console.log('• all listings already have Discussions — nothing to create');
} else {
  console.log(`✓ created ${created} Discussion(s)`);
}
