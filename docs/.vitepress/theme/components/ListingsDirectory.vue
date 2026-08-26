<script setup>
/**
 * ListingsDirectory — renders every registry record connected to the
 * official listing (data: /registry/listings.json, generated at build time
 * from listing/*.json by scripts/build-listings-index.mjs).
 */
import { ref, onMounted } from 'vue'
import { withBase } from 'vitepress'

const state = ref('loading')
const listings = ref([])

function money(amount, currency) {
  if (amount === null || amount === undefined) return ''
  const formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${formatted} ${currency}` : formatted
}

function shortRepo(repository) {
  return repository.replace(/^https:\/\/github\.com\//, '')
}

function toolUrl(entry) {
  const slug = entry.repository.replace('/', '-').toLowerCase()
  return withBase(`/registry/tools/${slug}/`)
}

onMounted(async () => {
  try {
    const res = await fetch(withBase('/registry/listings.json'))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    listings.value = Array.isArray(data.listings) ? data.listings : []
    state.value = 'ready'
  } catch {
    state.value = 'error'
  }
})
</script>

<template>
  <div class="ld-wrap">
    <p v-if="state === 'loading'" class="ld-note">Loading connected listings…</p>

    <p v-else-if="state === 'error'" class="ld-note">
      Registry index unavailable. It is generated from <code>listing/*.json</code> at build time.
    </p>

    <p v-else-if="listings.length === 0" class="ld-note ld-empty">
      No tools are connected yet. Be the first:
      <a href="/registry/verification">publish your repository through a Listing PR</a>.
    </p>

    <div v-else class="ld-grid">
      <article v-for="entry in listings" :key="`${entry.repository}@${entry.release}`" class="ld-card">
        <div class="ld-head">
          <span class="ld-repo">{{ shortRepo(entry.repository) }}</span>
          <span class="ld-release">{{ entry.release }}</span>
        </div>
        <div class="ld-meta">
          <span v-if="money(entry.amount, entry.currency)" class="ld-price">
            {{ money(entry.amount, entry.currency) }} <em>discovery contribution</em>
          </span>
        </div>
        <div class="ld-actions">
          <a class="ld-btn" :href="toolUrl(entry)">View details →</a>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.ld-wrap { margin-top: 1.5rem; }
.ld-note { color: var(--vp-c-text-2); }
.ld-empty a { color: var(--vp-c-brand-1); }
.ld-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.ld-card { border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 1.1rem 1.2rem; background: var(--vp-c-bg-soft); display: flex; flex-direction: column; gap: .8rem; }
.ld-head { display: flex; align-items: baseline; justify-content: space-between; gap: .8rem; }
.ld-repo { font-weight: 600; font-size: 1rem; word-break: break-all; }
.ld-release { font-family: var(--vp-font-family-mono); font-size: .78rem; border: 1px solid var(--vp-c-divider); border-radius: 999px; padding: .1rem .6rem; white-space: nowrap; }
.ld-meta { min-height: 1.2rem; }
.ld-price { font-weight: 700; }
.ld-price em { font-style: normal; font-weight: 400; color: var(--vp-c-text-2); font-size: .8rem; margin-left: .25rem; }
.ld-actions { display: flex; gap: .6rem; flex-wrap: wrap; }
.ld-btn { display: inline-block; background: var(--vp-c-brand-1); color: var(--vp-c-white); font-size: .85rem; font-weight: 600; text-decoration: none; border-radius: 8px; padding: .4rem .9rem; }
.ld-btn:hover { opacity: .9; text-decoration: none; }
.ld-btn--ghost { background: transparent; color: var(--vp-c-text-1); border: 1px solid var(--vp-c-divider); }
@media (max-width: 640px) { .ld-grid { grid-template-columns: 1fr; } }
</style>
