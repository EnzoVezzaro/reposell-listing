<script setup>
/**
 * ListingDetail — renders the full detail page for a single listing.
 * Reads from /registry/listings.json at runtime; receives listingId via props
 * from the generated markdown page. Fetches Discussion stats from GitHub's
 * public GraphQL API (no auth required for reads).
 */
import { ref, onMounted, computed } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps({
  listingId: { type: String, required: true },
})

const state = ref('loading')
const listing = ref(null)
const discussionStats = ref({ comments: 0, reactions: 0 })
const discussionLoading = ref(false)

function money(amount, currency) {
  if (amount === null || amount === undefined) return ''
  const formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${formatted} ${currency}` : formatted
}

function shortRepo(repository) {
  return repository.replace(/^https:\/\/github\.com\//, '')
}

const owner = computed(() => {
  if (!listing.value) return ''
  return listing.value.repository.split('/')[0] ?? ''
})

const repoName = computed(() => {
  if (!listing.value) return ''
  return listing.value.repository.split('/')[1] ?? ''
})

const githubUrl = computed(() => {
  if (!listing.value) return ''
  return `https://github.com/${listing.value.repository}`
})

const discussionUrl = computed(() => {
  const community = listing.value?.community?.github
  if (!community?.discussion_url) return null
  return community.discussion_url
})

const discussionNumber = computed(() => {
  return listing.value?.community?.github?.discussion_number ?? null
})

async function fetchDiscussionStats(owner, repo, number) {
  try {
    const query = `
      query ($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          discussion(number: $number) {
            comments { totalCount }
            reactions { totalCount }
          }
        }
      }
    `
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { owner, name: repo, number } }),
    })
    const json = await res.json()
    const d = json?.data?.repository?.discussion
    if (d) {
      discussionStats.value = {
        comments: d.comments?.totalCount ?? 0,
        reactions: d.reactions?.totalCount ?? 0,
      }
    }
  } catch {
    // Discussion stats are optional — degrade gracefully.
  }
}

onMounted(async () => {
  try {
    const res = await fetch(withBase('/registry/listings.json'))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const found = (data.listings ?? []).find((l) => l.id === props.listingId)
    if (!found) {
      state.value = 'not-found'
    } else {
      listing.value = found
      state.value = 'ready'

      // Fetch Discussion stats if available.
      const community = found.community?.github
      if (community?.discussion_number && community?.repository) {
        discussionLoading.value = true
        const [repoOwner, repoName] = community.repository.split('/')
        if (repoOwner && repoName) {
          await fetchDiscussionStats(repoOwner, repoName, community.discussion_number)
        }
        discussionLoading.value = false
      }
    }
  } catch {
    state.value = 'error'
  }
})
</script>

<template>
  <div class="ld-detail">
    <p v-if="state === 'loading'" class="ld-note">Loading listing details…</p>

    <p v-else-if="state === 'error'" class="ld-note ld-error">
      Could not load listing data. The registry index may be unavailable.
    </p>

    <p v-else-if="state === 'not-found'" class="ld-note ld-error">
      Listing not found. It may have been removed or the ID is incorrect.
    </p>

    <template v-else-if="state === 'ready' && listing">
      <div class="ld-detail-head">
        <div class="ld-detail-identity">
          <h1 class="ld-detail-title">{{ repoName }}</h1>
          <span class="ld-detail-owner">by {{ owner }}</span>
        </div>
        <div class="ld-detail-badges">
          <span class="ld-badge ld-badge--release">{{ listing.release }}</span>
          <span v-if="listing.id" class="ld-badge ld-badge--id">{{ listing.id }}</span>
        </div>
      </div>

      <div class="ld-detail-links">
        <a :href="githubUrl" target="_blank" rel="noopener" class="ld-link">
          View on GitHub ↗
        </a>
        <a v-if="listing.sell_url" :href="listing.sell_url" target="_blank" rel="noopener" class="ld-link">
          /sell endpoint ↗
        </a>
      </div>

      <div class="ld-detail-section">
        <h2>How to get access</h2>
        <ol class="ld-steps">
          <li>
            <div class="ld-step-head">
              <span class="ld-step-num">1</span>
              <span class="ld-step-title">Discovery contribution</span>
            </div>
            <p class="ld-step-desc">
              Pay a one-time {{ money(listing.amount, listing.currency) }} contribution to
              discover this tool on the reposell listing. This supports the
              ecosystem and helps keep the listing independent.
            </p>
            <a
              v-if="listing.payment_link"
              :href="listing.payment_link"
              class="ld-btn ld-btn--primary"
              target="_blank"
              rel="nofollow noopener"
            >
              Pay {{ money(listing.amount, listing.currency) }} contribution
            </a>
          </li>
          <li>
            <div class="ld-step-head">
              <span class="ld-step-num">2</span>
              <span class="ld-step-title">Purchase the license</span>
            </div>
            <p class="ld-step-desc">
              After the contribution, you'll be directed to the seller's own
              storefront to purchase the software license directly. The seller
              keeps 100% of the license revenue.
            </p>
            <a
              v-if="listing.sell_url"
              :href="listing.sell_url"
              class="ld-btn ld-btn--secondary"
              target="_blank"
              rel="noopener"
            >
              Go to seller's storefront →
            </a>
          </li>
        </ol>
      </div>

      <div v-if="discussionUrl" class="ld-detail-section ld-detail-community">
        <h2>Community</h2>
        <div class="ld-community-stats">
          <span v-if="!discussionLoading" class="ld-stat">
            <span class="ld-stat-icon">💬</span>
            {{ discussionStats.comments }} {{ discussionStats.comments === 1 ? 'comment' : 'comments' }}
          </span>
          <span v-if="!discussionLoading" class="ld-stat">
            <span class="ld-stat-icon">👍</span>
            {{ discussionStats.reactions }} {{ discussionStats.reactions === 1 ? 'reaction' : 'reactions' }}
          </span>
          <span v-if="discussionLoading" class="ld-stat ld-stat--loading">Loading…</span>
        </div>
        <a :href="discussionUrl" class="ld-btn ld-btn--community" target="_blank" rel="noopener">
          Join Discussion ↗
        </a>
      </div>

      <div class="ld-detail-section ld-detail-about">
        <h2>About this listing</h2>
        <dl class="ld-detail-meta">
          <dt>Repository</dt>
          <dd>{{ listing.repository }}</dd>
          <dt>Release</dt>
          <dd>{{ listing.release }}</dd>
          <dt>Discovery contribution</dt>
          <dd>{{ money(listing.amount, listing.currency) }}</dd>
          <dt>Sell endpoint</dt>
          <dd><a :href="listing.sell_url" target="_blank" rel="noopener">{{ listing.sell_url }}</a></dd>
          <template v-if="discussionNumber">
            <dt>Discussion</dt>
            <dd><a :href="discussionUrl" target="_blank" rel="noopener">#{{ discussionNumber }}</a></dd>
          </template>
        </dl>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ld-detail { max-width: 720px; margin: 0 auto; }
.ld-note { color: var(--vp-c-text-2); padding: 2rem 0; }
.ld-error { color: var(--vp-c-danger-1); }

.ld-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.ld-detail-title { font-size: 1.8rem; font-weight: 700; margin: 0; }
.ld-detail-owner { color: var(--vp-c-text-2); font-size: 0.95rem; }
.ld-detail-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.ld-badge { font-family: var(--vp-font-family-mono); font-size: 0.78rem; border: 1px solid var(--vp-c-divider); border-radius: 999px; padding: 0.15rem 0.65rem; white-space: nowrap; }
.ld-badge--release { background: var(--vp-c-bg-soft); }
.ld-badge--id { color: var(--vp-c-text-2); }

.ld-detail-links { display: flex; gap: 1rem; margin-bottom: 2rem; }
.ld-link { color: var(--vp-c-brand-1); font-size: 0.9rem; text-decoration: none; }
.ld-link:hover { text-decoration: underline; }

.ld-detail-section { margin-bottom: 2.5rem; }
.ld-detail-section h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; border-bottom: 1px solid var(--vp-c-divider); padding-bottom: 0.5rem; }

.ld-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1.5rem; }
.ld-step-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; }
.ld-step-num { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; border-radius: 50%; background: var(--vp-c-brand-1); color: var(--vp-c-white); font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
.ld-step-title { font-weight: 600; font-size: 1rem; }
.ld-step-desc { color: var(--vp-c-text-2); font-size: 0.92rem; line-height: 1.6; margin: 0 0 0.8rem 2.2rem; }

.ld-btn { display: inline-block; font-size: 0.88rem; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 0.5rem 1.1rem; margin-left: 2.2rem; }
.ld-btn:hover { opacity: 0.9; text-decoration: none; }
.ld-btn--primary { background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.ld-btn--secondary { background: transparent; color: var(--vp-c-brand-1); border: 1px solid var(--vp-c-brand-1); }
.ld-btn--community { background: var(--vp-c-default-soft); color: var(--vp-c-text-1); border: 1px solid var(--vp-c-divider); }

.ld-detail-community { background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem 1.4rem; }
.ld-detail-community h2 { border: none; padding: 0; margin-bottom: 0.8rem; }
.ld-community-stats { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
.ld-stat { display: flex; align-items: center; gap: 0.4rem; font-size: 0.92rem; color: var(--vp-c-text-2); }
.ld-stat-icon { font-size: 1rem; }
.ld-stat--loading { font-style: italic; }

.ld-detail-about dl { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem; font-size: 0.9rem; }
.ld-detail-about dt { font-weight: 600; color: var(--vp-c-text-2); }
.ld-detail-about dd { margin: 0; }
.ld-detail-about a { color: var(--vp-c-brand-1); text-decoration: none; word-break: break-all; }
.ld-detail-about a:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .ld-detail-head { flex-direction: column; }
  .ld-btn { margin-left: 0; }
  .ld-step-desc { margin-left: 0; }
}
</style>
