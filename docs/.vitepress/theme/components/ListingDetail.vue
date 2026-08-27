<script setup>
/**
 * ListingDetail — renders the full detail page for a single listing.
 * ALL data comes from the listing record (captured during reposell listing publish).
 * No GitHub API calls — works for private repos.
 *
 * Flow: GitHub login → pay contribution → Stripe redirect with session_id → storefront button enabled.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const GITHUB_CLIENT_ID = 'Iv23lidhennqrdpdFUAT'
const CORS_PROXY = 'https://corsproxy.io/?url='
const GH_TOKEN_KEY = 'rs-listing-gh-token'
const GH_USER_KEY = 'rs-listing-gh-user'

const props = defineProps({
  listingId: { type: String, required: true },
})

// --- listing data ---
const state = ref('loading')
const listing = ref(null)

// --- GitHub Device Flow ---
const ghState = ref('idle') // idle | device | polling | connected | error
const ghError = ref('')
const deviceCode = ref('')
const userCode = ref('')
const verificationUri = ref('')
const countdown = ref(0)
const ghToken = ref('')
const ghUser = ref(null)
let pollTimer = null

// --- payment ---
const contributionPaid = ref(false)

// Payment link validity — set from listing record
const paymentLinkActive = computed(() => listing.value?.payment_link_active !== false)
const paymentLinkError = computed(() => listing.value?.payment_link_error ?? null)

function proxyFetch(url, options) {
  return fetch(`${CORS_PROXY}${encodeURIComponent(url)}`, options)
}

const owner = computed(() => listing.value?.repository?.split('/')[0] ?? '')
const repoName = computed(() => listing.value?.repository?.split('/')[1] ?? '')
const githubUrl = computed(() => listing.value ? `https://github.com/${listing.value.repository}` : '')
const discussionUrl = computed(() => listing.value?.community?.github?.discussion_url ?? null)
const discussionNumber = computed(() => listing.value?.community?.github?.discussion_number ?? null)

const ghConnected = computed(() => ghState.value === 'connected')

const paymentUrl = computed(() => {
  if (!listing.value?.payment_link) return ''
  // Pass the GitHub token via state param so we know who's paying
  const state = btoa(JSON.stringify({ listing_id: listing.value.id, gh_user: ghUser.value?.login }))
  return `${listing.value.payment_link}?client_reference_id=${encodeURIComponent(state)}`
})

function money(amount, currency) {
  if (amount === null || amount === undefined) return ''
  const formatted = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${formatted} ${currency}` : formatted
}

// --- GitHub Device Flow ---

async function connectGithub() {
  ghState.value = 'device'
  ghError.value = ''

  try {
    const res = await proxyFetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: 'repo' }),
    })
    const data = await res.json()

    if (data.error) {
      ghState.value = 'error'
      ghError.value = data.error_description || 'GitHub rejected the request — try again.'
      return
    }

    deviceCode.value = data.device_code
    userCode.value = data.user_code
    verificationUri.value = data.verification_uri
    window.open(data.verification_uri, '_blank', 'noopener')
    startPolling(data.device_code, data.interval || 5, data.expires_in || 900)
  } catch {
    ghState.value = 'error'
    ghError.value = 'Could not reach GitHub — check your connection.'
  }
}

function startPolling(code, interval, expiresIn) {
  countdown.value = expiresIn
  const deadline = Date.now() + expiresIn * 1000

  pollTimer = setInterval(() => {
    countdown.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (countdown.value <= 0) {
      stopPolling()
      ghState.value = 'error'
      ghError.value = 'Device code expired — try again.'
    }
  }, 1000)

  pollForToken(code, interval * 1000, deadline)
}

async function pollForToken(code, intervalMs, deadline) {
  if (Date.now() >= deadline) {
    stopPolling()
    ghState.value = 'error'
    ghError.value = 'Device code expired — try again.'
    return
  }

  await new Promise((r) => setTimeout(r, intervalMs))

  try {
    const res = await proxyFetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })
    const data = await res.json()

    if (data.access_token) {
      stopPolling()
      ghToken.value = data.access_token
      ghState.value = 'connected'
      // Fetch user info
      try {
        const uRes = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
        if (uRes.ok) {
          ghUser.value = await uRes.json()
          // Persist to sessionStorage so login survives page refresh
          try {
            sessionStorage.setItem(GH_TOKEN_KEY, data.access_token)
            sessionStorage.setItem(GH_USER_KEY, JSON.stringify(ghUser.value))
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      return
    }

    if (data.error === 'authorization_pending') {
      pollForToken(code, intervalMs, deadline)
      return
    }

    if (data.error === 'slow_down') {
      pollForToken(code, intervalMs + 5000, deadline)
      return
    }

    // Other errors (access_denied, expired_token, etc.)
    stopPolling()
    ghState.value = 'error'
    ghError.value = data.error_description || 'Authorization failed — try again.'
  } catch {
    pollForToken(code, intervalMs, deadline)
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function disconnectGithub() {
  ghToken.value = ''
  ghUser.value = null
  ghState.value = 'idle'
  stopPolling()
  try {
    sessionStorage.removeItem(GH_TOKEN_KEY)
    sessionStorage.removeItem(GH_USER_KEY)
  } catch { /* ignore */ }
}

onBeforeUnmount(() => stopPolling())

// --- payment confirmation from Stripe redirect URL ---

function checkPaymentConfirmation() {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('session_id')) {
      contributionPaid.value = true
      // Clean the URL so the session_id isn't visible
      const url = new URL(window.location.href)
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
    }
  } catch { /* ignore */ }
}

// --- runtime link validation ---

const linksValidating = ref(true) // blocks ALL payment until checks complete
const discoveryLinkValid = ref(false) // start false — blocks until validated
const sellPageValid = ref(false) // start false — blocks until validated
const linkErrors = ref([])

async function validateDiscoveryLink(paymentLink) {
  if (!paymentLink) { discoveryLinkValid.value = true; return }
  try {
    const res = await fetch(paymentLink, { method: 'HEAD', redirect: 'follow' })
    if (res.ok) {
      discoveryLinkValid.value = true
    } else {
      discoveryLinkValid.value = false
      linkErrors.value.push('Discovery contribution link is not active.')
    }
  } catch {
    // CORS may block this — fail open (trust CI validation)
    discoveryLinkValid.value = true
  }
}

async function validateSellPage(sellUrl) {
  if (!sellUrl) { sellPageValid.value = true; return }
  try {
    const res = await fetch(sellUrl)
    if (!res.ok) {
      sellPageValid.value = false
      linkErrors.value.push('Seller storefront is not accessible.')
      return
    }
    const html = await res.text()
    const match = html.match(/<script[^>]*id="reposell-data"[^>]*>([\s\S]*?)<\/script>/)
    if (match) {
      const data = JSON.parse(match[1])
      const hasActive = (data.releases ?? []).some(
        (r) => r.status === 'available' && (r.offers ?? []).some((o) => o.status === 'available')
      )
      if (hasActive) {
        sellPageValid.value = true
      } else {
        sellPageValid.value = false
        linkErrors.value.push('Seller has no active payment links for this release.')
      }
    } else {
      sellPageValid.value = false
      linkErrors.value.push('Seller storefront does not have valid payment data.')
    }
  } catch {
    sellPageValid.value = false
    linkErrors.value.push('Seller storefront is not accessible.')
  }
}

// --- init ---

onMounted(async () => {
  // Restore GitHub session from sessionStorage
  try {
    const savedToken = sessionStorage.getItem(GH_TOKEN_KEY)
    const savedUser = sessionStorage.getItem(GH_USER_KEY)
    if (savedToken && savedUser) {
      ghToken.value = savedToken
      ghUser.value = JSON.parse(savedUser)
      ghState.value = 'connected'
    }
  } catch { /* ignore */ }

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
      checkPaymentConfirmation()

      // Runtime validation: check both links in parallel, then unlock payment
      await Promise.all([
        validateDiscoveryLink(found.payment_link),
        validateSellPage(found.sell_url),
      ])
      linksValidating.value = false
    }
  } catch {
    state.value = 'error'
    linksValidating.value = false
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
          <span v-for="tag in (listing.tags || [])" :key="tag" class="ld-badge ld-badge--tag">{{ tag }}</span>
        </div>
      </div>

      <p v-if="listing.description" class="ld-repo-desc">{{ listing.description }}</p>

      <div class="ld-detail-links">
        <a :href="githubUrl" target="_blank" rel="noopener" class="ld-link">
          View on GitHub ↗
        </a>
      </div>

      <!-- README from listing record — no API -->
      <div v-if="listing.readme" class="ld-readme-viewer">
        <h3 class="ld-readme-title">README</h3>
        <pre class="ld-readme-scroll">{{ listing.readme }}</pre>
      </div>

      <!-- GitHub connection -->
      <div class="ld-detail-section ld-gh-section">
        <h2>GitHub account</h2>

        <template v-if="ghConnected && ghUser">
          <div class="ld-gh-connected">
            <span class="ld-gh-avatar">✓</span>
            <span class="ld-gh-user">@{{ ghUser.login }}</span>
            <button class="ld-gh-disconnect" @click="disconnectGithub">Disconnect</button>
          </div>
        </template>

        <template v-else-if="ghState === 'device' || ghState === 'polling'">
          <div class="ld-gh-device">
            <p class="ld-gh-instructions">
              Enter this code on GitHub:
              <strong class="ld-gh-code">{{ userCode }}</strong>
            </p>
            <p class="ld-gh-timer">{{ countdown }}s remaining</p>
          </div>
        </template>

        <template v-else-if="ghState === 'error'">
          <p class="ld-gh-error">{{ ghError }}</p>
          <button class="ld-btn ld-btn--primary" @click="connectGithub">Try again</button>
        </template>

        <template v-else>
          <p class="ld-gh-hint">Connect your GitHub account to purchase this listing.</p>
          <button class="ld-btn ld-btn--primary" @click="connectGithub">Connect GitHub</button>
        </template>
      </div>

      <!-- How to get access -->
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
            <!-- Validating links — block all payment -->
            <p v-if="linksValidating && ghConnected && !contributionPaid" class="ld-step-hint">
              Validating payment links…
            </p>
            <!-- Links validated: show Pay or Warning -->
            <a
              v-if="listing.payment_link && ghConnected && !contributionPaid && !linksValidating && discoveryLinkValid"
              :href="paymentUrl"
              class="ld-btn ld-btn--primary"
              rel="nofollow noopener"
            >
              Pay {{ money(listing.amount, listing.currency) }} contribution
            </a>
            <span
              v-else-if="listing.payment_link && ghConnected && contributionPaid"
              class="ld-btn ld-btn--paid"
            >
              Paid {{ money(listing.amount, listing.currency) }} contribution ✓
            </span>
            <p v-if="listing.payment_link && ghConnected && !contributionPaid && !linksValidating && !discoveryLinkValid" class="ld-step-hint ld-warning">
              ⚠ {{ linkErrors[0] || 'Payment link is currently unavailable.' }}
            </p>
            <p v-if="!ghConnected" class="ld-step-hint">
              Connect your GitHub account above to proceed with payment.
            </p>
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
              :class="{ 'ld-btn--disabled': !contributionPaid || !sellPageValid || linksValidating }"
              :aria-disabled="!contributionPaid || !sellPageValid || linksValidating"
              :tabindex="contributionPaid && sellPageValid && !linksValidating ? 0 : -1"
              target="_blank"
              rel="noopener"
              @click="contributionPaid && sellPageValid && !linksValidating ? null : $event.preventDefault()"
            >
              Go to seller's storefront →
            </a>
            <p v-if="!contributionPaid && sellPageValid && !linksValidating" class="ld-step-hint">
              To buy &amp; fork this, you need to pay the listing fee above.
            </p>
            <p v-if="!linksValidating && !sellPageValid" class="ld-step-hint ld-warning">
              ⚠ {{ linkErrors.find(e => e.includes('storefront') || e.includes('payment data')) || 'Seller storefront is not available.' }}
            </p>
          </li>
        </ol>
      </div>

      <!-- Discussion -->
      <div v-if="discussionUrl" class="ld-detail-section ld-detail-community">
        <h2>Community</h2>
        <a :href="discussionUrl" class="ld-btn ld-btn--community" target="_blank" rel="noopener">
          Join Discussion ↗
        </a>
      </div>

      <!-- About -->
      <div class="ld-detail-section ld-detail-about">
        <h2>About this listing</h2>
        <dl class="ld-detail-meta">
          <dt>Repository</dt>
          <dd><a :href="githubUrl" target="_blank" rel="noopener">{{ listing.repository }}</a></dd>
          <dt>Release</dt>
          <dd>{{ listing.release }}</dd>
          <dt v-if="listing.repo_price">Price</dt>
          <dd v-if="listing.repo_price">{{ money(listing.repo_price, listing.repo_currency) }} <span class="ld-meta-note">(seller's license price)</span></dd>
          <dt v-if="listing.license">License</dt>
          <dd v-if="listing.license">{{ listing.license }}</dd>
          <dt>Discovery contribution</dt>
          <dd>{{ money(listing.amount, listing.currency) }} <span class="ld-meta-note">(buyer-paid, on top of seller's price)</span></dd>
          <template v-if="listing.tags && listing.tags.length > 0">
            <dt>Tags</dt>
            <dd>
              <span v-for="tag in listing.tags" :key="tag" class="ld-badge ld-badge--tag">{{ tag }}</span>
            </dd>
          </template>
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
.ld-badge--tag { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }

.ld-detail-links { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
.ld-link { color: var(--vp-c-brand-1); font-size: 0.9rem; text-decoration: none; }
.ld-link:hover { text-decoration: underline; }

/* README viewer */
.ld-readme-viewer { margin-bottom: 2rem; }
.ld-readme-title { font-size: 0.9rem; font-weight: 600; color: var(--vp-c-text-2); margin: 0 0 0.6rem; }
.ld-readme-scroll { max-height: 500px; overflow-y: auto; border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 1rem 1.2rem; background: var(--vp-c-bg); font-family: var(--vp-font-family-mono); font-size: 0.82rem; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; color: var(--vp-c-text-2); }

/* GitHub section */
.ld-gh-section { background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem 1.4rem; }
.ld-gh-section h2 { border: none; padding: 0; margin-bottom: 0.8rem; font-size: 1.1rem; }
.ld-gh-connected { display: flex; align-items: center; gap: 0.6rem; }
.ld-gh-avatar { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; border-radius: 50%; background: #238636; color: white; font-size: 0.8rem; font-weight: 700; }
.ld-gh-user { font-weight: 600; font-size: 0.95rem; }
.ld-gh-disconnect { margin-left: auto; background: none; border: none; color: var(--vp-c-text-3); font-size: 0.82rem; cursor: pointer; text-decoration: underline; }
.ld-gh-device { text-align: center; }
.ld-gh-instructions { font-size: 0.92rem; color: var(--vp-c-text-1); margin: 0 0 0.4rem; }
.ld-gh-code { font-family: var(--vp-font-family-mono); font-size: 1.4rem; letter-spacing: 0.15em; color: var(--vp-c-brand-1); background: var(--vp-c-bg); padding: 0.3rem 0.8rem; border-radius: 6px; border: 1px dashed var(--vp-c-divider); }
.ld-gh-timer { font-size: 0.82rem; color: var(--vp-c-text-3); margin: 0; }
.ld-gh-hint { font-size: 0.92rem; color: var(--vp-c-text-2); margin: 0 0 0.8rem; }
.ld-gh-error { font-size: 0.92rem; color: var(--vp-c-danger-1); margin: 0 0 0.8rem; }

/* Steps */
.ld-detail-section { margin-bottom: 2.5rem; }
.ld-detail-section h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; border-bottom: 1px solid var(--vp-c-divider); padding-bottom: 0.5rem; }

.ld-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1.5rem; }
.ld-step-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; }
.ld-step-num { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; border-radius: 50%; background: var(--vp-c-brand-1); color: var(--vp-c-white); font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
.ld-step-title { font-weight: 600; font-size: 1rem; }
.ld-step-desc { color: var(--vp-c-text-2); font-size: 0.92rem; line-height: 1.6; margin: 0 0 0.8rem 2.2rem; }
.ld-step-hint { font-size: 0.82rem; color: var(--vp-c-text-3); margin: 0.4rem 0 0 2.2rem; font-style: italic; }
.ld-step-hint.ld-warning { color: var(--vp-c-danger-1); font-style: normal; font-weight: 500; }

.ld-btn { display: inline-block; font-size: 0.88rem; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 0.5rem 1.1rem; margin-left: 2.2rem; cursor: pointer; border: none; }
.ld-btn:hover { opacity: 0.9; text-decoration: none; }
.ld-btn--primary { background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.ld-btn--secondary { background: transparent; color: var(--vp-c-brand-1); border: 1px solid var(--vp-c-brand-1); }
.ld-btn--disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; border: 2px dashed var(--vp-c-text-3) !important; color: var(--vp-c-text-3); background: transparent !important; }
.ld-btn--paid { display: inline-block; font-size: 0.88rem; font-weight: 600; text-decoration: none; border-radius: 8px; padding: 0.5rem 1.1rem; margin-left: 2.2rem; cursor: not-allowed; pointer-events: none; border: 2px dashed var(--vp-c-text-3) !important; color: var(--vp-c-text-3); background: transparent !important; opacity: 0.4; }
.ld-btn--community { background: var(--vp-c-default-soft); color: var(--vp-c-text-1); border: 1px solid var(--vp-c-divider); }

/* Community */
.ld-detail-community { background: var(--vp-c-bg-soft); border-radius: 12px; padding: 1.2rem 1.4rem; }
.ld-detail-community h2 { border: none; padding: 0; margin-bottom: 0.8rem; }

/* About */
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
