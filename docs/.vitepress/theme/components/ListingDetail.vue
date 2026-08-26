<script setup>
/**
 * ListingDetail — renders the full detail page for a single listing.
 * Reads from /registry/listings.json at runtime; receives listingId via props
 * from the generated markdown page. Fetches Discussion stats from GitHub's
 * public GraphQL API and repository info (description, README) from the REST API.
 *
 * The "Go to seller's storefront" CTA is gated behind a localStorage flag
 * that is set after the buyer clicks the contribution payment button.
 * This is a UX gate, not a cryptographic one — the storefront URL is public.
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
const repoInfo = ref(null)
const repoInfoLoading = ref(false)
const contributionPaid = ref(false)

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

const paymentKey = computed(() => {
  if (!listing.value) return ''
  return `reposell-contrib-paid:${listing.value.id}`
})

function markContributionPaid() {
  try {
    localStorage.setItem(paymentKey.value, Date.now().toString())
  } catch {
    // localStorage may be unavailable — degrade gracefully.
  }
  contributionPaid.value = true
}

function checkContributionPaid() {
  try {
    const val = localStorage.getItem(paymentKey.value)
    if (val) {
      const ts = Number(val)
      // Flag expires after 24 hours.
      if (Number.isFinite(ts) && Date.now() - ts < 24 * 60 * 60 * 1000) {
        contributionPaid.value = true
      }
    }
  } catch {
    // localStorage unavailable — default to not paid.
  }
}

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

async function fetchRepoInfo(owner, repo) {
  repoInfoLoading.value = true
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
    if (!res.ok) return
    const data = await res.json()
    repoInfo.value = {
      description: data.description ?? '',
      topics: data.topics ?? [],
      stars: data.stargazers_count ?? 0,
      language: data.language ?? '',
      license: data.license?.spdx_id ?? '',
      homepage: data.homepage ?? '',
    }

    // Use README from the listing record (fetched by CLI during publish)
    if (found.readme) {
      repoInfo.value.readmeText = found.readme
    }
  } catch {
    // Repo info is optional — degrade gracefully.
  } finally {
    repoInfoLoading.value = false
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

      checkContributionPaid()

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

      // Fetch repository info from GitHub.
      const repoParts = found.repository?.split('/')
      if (repoParts?.length === 2) {
        await fetchRepoInfo(repoParts[0], repoParts[1])
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
      </div>

      <div v-if="repoInfo" class="ld-detail-repo">
        <p v-if="repoInfo.description" class="ld-repo-desc">{{ repoInfo.description }}</p>
        <div class="ld-repo-meta">
          <span v-if="repoInfo.language" class="ld-repo-tag">{{ repoInfo.language }}</span>
          <span v-if="repoInfo.stars" class="ld-repo-tag">⭐ {{ repoInfo.stars.toLocaleString() }}</span>
          <span v-if="repoInfo.license" class="ld-repo-tag">{{ repoInfo.license }}</span>
          <span v-for="topic in repoInfo.topics?.slice(0, 4)" :key="topic" class="ld-repo-tag ld-repo-tag--topic">{{ topic }}</span>
        </div>
        <div v-if="repoInfo.readmeText" class="ld-readme-viewer">
          <h3 class="ld-readme-title">README</h3>
          <pre class="ld-readme-scroll">{{ repoInfo.readmeText }}</pre>
        </div>
      </div>
      <p v-else-if="repoInfoLoading" class="ld-note ld-loading">Loading repository info…</p>

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
              ecosystem and helps keep the listing independent. The contribution
              is on top of the seller's own price — the seller keeps 100% of
              their license revenue.
            </p>
            <a
              v-if="listing.payment_link"
              :href="listing.payment_link"
              class="ld-btn ld-btn--primary"
              target="_blank"
              rel="nofollow noopener"
              @click="markContributionPaid"
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
              :class="{ 'ld-btn--disabled': !contributionPaid }"
              :aria-disabled="!contributionPaid"
              :tabindex="contributionPaid ? 0 : -1"
              target="_blank"
              rel="noopener"
              @click.prevent="contributionPaid ? undefined : null"
            >
              Go to seller's storefront →
            </a>
            <p v-if="!contributionPaid" class="ld-step-hint">
              To buy &amp; fork this, you need to pay the listing fee above.
            </p>
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
          <dd><a :href="githubUrl" target="_blank" rel="noopener">{{ listing.repository }}</a></dd>
          <dt>Release</dt>
          <dd>{{ listing.release }}</dd>
          <dt>Discovery contribution</dt>
          <dd>{{ money(listing.amount, listing.currency) }} <span class="ld-meta-note">(buyer-paid, on top of seller's price)</span></dd>
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
.ld-loading { font-style: italic; }

.ld-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.ld-detail-title { font-size: 1.8rem; font-weight: 700; margin: 0; }
.ld-detail-owner { color: var(--vp-c-text-2); font-size: 0.95rem; }
.ld-detail-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.ld-badge { font-family: var(--vp-font-family-mono); font-size: 0.78rem; border: 1px solid var(--vp-c-divider); border-radius: 999px; padding: 0.15rem 0.65rem; white-space: nowrap; }
.ld-badge--release { background: var(--vp-c-bg-soft); }
.ld-badge--id { color: var(--vp-c-text-2); }

.ld-detail-links { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.ld-link { color: var(--vp-c-brand-1); font-size: 0.9rem; text-decoration: none; }
.ld-link:hover { text-decoration: underline; }

.ld-detail-repo { margin-bottom: 2rem; padding: 1.2rem 1.4rem; background: var(--vp-c-bg-soft); border-radius: 12px; border: 1px solid var(--vp-c-divider); }
.ld-repo-desc { font-size: 1rem; color: var(--vp-c-text-1); margin: 0 0 0.6rem; line-height: 1.5; }
.ld-repo-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.8rem; }
.ld-repo-tag { font-size: 0.78rem; padding: 0.15rem 0.55rem; border-radius: 999px; background: var(--vp-c-default-soft); color: var(--vp-c-text-2); white-space: nowrap; }
.ld-repo-tag--topic { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
.ld-readme-viewer { border-top: 1px solid var(--vp-c-divider); padding-top: 1rem; margin-top: 0.8rem; }
.ld-readme-title { font-size: 0.9rem; font-weight: 600; color: var(--vp-c-text-2); margin: 0 0 0.6rem; }
.ld-readme-scroll { max-height: 400px; overflow-y: auto; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 1rem 1.2rem; background: var(--vp-c-bg); font-size: 0.9rem; line-height: 1.7; }
.ld-readme-scroll { font-family: var(--vp-font-family-mono); font-size: 0.82rem; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; color: var(--vp-c-text-2); }

.ld-detail-section { margin-bottom: 2.5rem; }
.ld-detail-section h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; border-bottom: 1px solid var(--vp-c-divider); padding-bottom: 0.5rem; }

.ld-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1.5rem; }
.ld-step-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; }
.ld-step-num { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; border-radius: 50%; background: var(--vp-c-brand-1); color: var(--vp-c-white); font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
.ld-step-title { font-weight: 600; font-size: 1rem; }
.ld-step-desc { color: var(--vp-c-text-2); font-size: 0.92rem; line-height: 1.6; margin: 0 0 0.8rem 2.2rem; }
.ld-step-hint { font-size: 0.82rem; color: var(--vp-c-text-3); margin: 0.4rem 0 0 2.2rem; font-style: italic; }

.ld-btn { display: inline-block; font-size: 0.88rem; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 0.5rem 1.1rem; margin-left: 2.2rem; cursor: pointer; }
.ld-btn:hover { opacity: 0.9; text-decoration: none; }
.ld-btn--primary { background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.ld-btn--secondary { background: transparent; color: var(--vp-c-brand-1); border: 1px solid var(--vp-c-brand-1); }
.ld-btn--disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; border-style: dashed; color: var(--vp-c-text-3); }
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
.ld-meta-note { color: var(--vp-c-text-3); font-size: 0.82rem; }

@media (max-width: 640px) {
  .ld-detail-head { flex-direction: column; }
  .ld-btn { margin-left: 0; }
  .ld-step-desc { margin-left: 0; }
  .ld-step-hint { margin-left: 0; }
}
</style>
