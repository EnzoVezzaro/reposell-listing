---
layout: home
footer: false

title: reposell Listing
description: Discover software sold straight from the source. Every listing cryptographically verified.
---

<LandingHero>
  <template #title>
    <h1 class="lx-title">Discover.<br />Verify.<br /><em>Trust.</em></h1>
  </template>
  <template #subtitle>
    <p class="lx-sub">The official discovery directory for software sold straight from the source.
      Every listing is a signed manifest, checked against the official Ed25519 key —
      what you see is exactly what the developer shipped.</p>
  </template>
  <template #actions>
    <a class="lx-btn lx-btn--solid" href="#how">See how it works</a>
    <a class="lx-btn lx-btn--ghost" href="#trust">Why you can trust it</a>
  </template>
  <template #chip>
    <HomeCopyChip cmd="npx @reposell/cli listing status" />
  </template>
  <template #trust>
    <ul class="lx-trust" aria-label="Works with">
      <li>Ed25519</li>
      <li>/listing endpoints</li>
      <li>Signed pricing</li>
      <li>Zero servers</li>
    </ul>
  </template>
</LandingHero>

<div class="lx-shell">
  <div class="lx-vprops">
    <div class="lx-vprop"><strong>Discovery only</strong><span>The listing never sells the software — sellers always do.</span></div>
    <div class="lx-vprop"><strong>Signed before shown</strong><span>Unverified manifests never appear. No exceptions.</span></div>
    <div class="lx-vprop"><strong>Immutable per release</strong><span>Every release keeps its own permanent record.</span></div>
    <div class="lx-vprop"><strong>Zero servers</strong><span>The registry is a Git repository. CI is the only machine.</span></div>
  </div>

  <section id="how" class="lx-section lx-reveal">
    <div class="lx-h2row">
      <span class="lx-num" aria-hidden="true">01</span>
      <div class="lx-h2block">
        <p class="kick">/ discovery</p>
        <h2>How listing works.</h2>
        <p class="lede">Developers opt in by shipping a manifest. We crawl, verify and list — the seller's own storefront always closes the sale.</p>
      </div>
    </div>
    <div class="lx-pipeline">
      <div class="lx-step"><strong>publish</strong><span>A seller opens a Listing PR containing only a pointer to their repository and /sell page.</span></div>
      <div class="lx-step"><strong>verify</strong><span>Listing CI checks the live /sell: identity, release, signature, license, seller Payment Link.</span></div>
      <div class="lx-step"><strong>list</strong><span>On PASS the PR merges and the product appears — with its own immutable discovery record.</span></div>
    </div>
  </section>
</div>

<section class="lx-ticker" aria-hidden="true">
  <div class="lx-ticker-track">
    <span>Verify everything</span><i>✦</i>
    <span>Signed pricing</span><i>✦</i>
    <span>Instant licenses</span><i>✦</i>
    <span>Open settlements</span><i>✦</i>
    <span>Verify everything</span><i>✦</i>
    <span>Signed pricing</span><i>✦</i>
    <span>Instant licenses</span><i>✦</i>
    <span>Open settlements</span><i>✦</i>
  </div>
</section>

<div class="lx-shell">
  <section id="trust" class="lx-section lx-reveal">
    <div class="lx-h2row">
      <span class="lx-num" aria-hidden="true">02</span>
      <div class="lx-h2block">
        <p class="kick">/ trust</p>
        <h2>Twelve gates. No exceptions.</h2>
        <p class="lede">Listing CI verifies every PR fail-closed — schema, repository identity, release, signature, license, the live /sell page, the seller Payment Link, discovery pricing, duplicates and security.</p>
      </div>
    </div>
    <div class="lx-bento">
      <div class="lx-cell lx-wide lx-glow">
        <p class="lx-cell-title">Fail closed</p>
        <p class="lx-cell-desc">Anything invalid blocks the PR. Nothing is "approved by hand".</p>
        <code class="lx-code"><span class="c">$</span> listing-ci <span class="k">verify</span> <span class="m"># 12/12 or BLOCKED</span></code>
      </div>
      <div class="lx-cell">
        <p class="lx-cell-title">Seller link verified-only</p>
        <p class="lx-cell-desc">The listing checks the seller's Payment Link. It never creates or touches it.</p>
        <code class="lx-code">verify <span class="k">/sell</span> → <span class="s">match or BLOCKED</span></code>
      </div>
      <div class="lx-cell">
        <p class="lx-cell-title">Immutable records</p>
        <p class="lx-cell-desc">Old discovery links stay valid forever. History is verifiable.</p>
        <code class="lx-code">v1.0 <span class="k">→</span> link A <span class="s">forever</span></code>
      </div>
      <div class="lx-cell">
        <p class="lx-cell-title">Two transactions</p>
        <p class="lx-cell-desc">Discovery pays reposell. Software pays the seller. Never mixed.</p>
        <code class="lx-code">discovery <span class="k">≠</span> purchase</code>
      </div>
    </div>
  </section>

  <section id="sellers" class="lx-section lx-reveal">
    <div class="lx-h2row">
      <span class="lx-num" aria-hidden="true">03</span>
      <div class="lx-h2block">
        <p class="kick">/ sellers</p>
        <h2>Get listed in minutes.</h2>
        <p class="lede">If your repository already has a /sell endpoint, listing is one command and one PR.</p>
      </div>
    </div>
    <div class="lx-mathgrid lx-reveal">
      <div class="lx-mathcard">
        <p class="kick">step 1 — from your repo</p>
        <code class="lx-code"><span class="c">$</span> reposell listing publish <span class="k">v1.2.0</span></code>
        <p class="lx-math-note">Builds the PR payload, health-checks your live /sell, writes .reposell/listing-pr.json.</p>
      </div>
      <div class="lx-mathcard">
        <p class="kick">step 2 — open the PR</p>
        <code class="lx-code">listing PR → <span class="k">CI verify</span> → <span class="s">merge</span></code>
        <p class="lx-math-note">CI re-verifies everything independently. PASS merges; BLOCKED explains why.</p>
      </div>
    </div>
  </section>

  <section id="jump" class="lx-section">
    <div class="lx-links">
      <a class="lx-link" href="/protocol/listing-registry"><strong>Listing registry</strong><span>The PR format and verification pipeline.</span></a>
      <a class="lx-link" href="/protocol/signatures"><strong>Signatures</strong><span>Ed25519 verification against the official key.</span></a>
      <a class="lx-link" href="/protocol/sell-endpoint"><strong>/sell endpoint</strong><span>What sellers publish and how it's checked.</span></a>
      <a class="lx-link" href="https://github.com/EnzoVezzaro/reposell-listing"><strong>Registry repository</strong><span>The registry is a public Git repo.</span></a>
    </div>
  </section>
</div>

<footer class="lx-footer">
  <FooterWordmark />
  <div class="lx-shell">
    <div class="lx-footer-grid">
      <div class="lx-fcol lx-fbrand">
        <h4>reposell listing</h4>
        <p class="lx-fblurb">The official discovery directory. Every listing cryptographically verified against the seller's own live /sell.</p>
        <p>Made with ☕ and 🎧 by Enzo Vezzaro — a solo developer from the Dominican Republic, building for a team tomorrow.</p>
      </div>
      <nav class="lx-fcol" aria-label="Protocol">
        <h4>Protocol</h4>
        <ul>
          <li><a href="/protocol/listing-registry">Listing registry</a></li>
          <li><a href="/docs/protocol/manifest-schema">Manifest schema</a></li>
          <li><a href="/protocol/signatures">Signatures</a></li>
          <li><a href="/protocol/sell-endpoint">/sell endpoint</a></li>
        </ul>
      </nav>
      <nav class="lx-fcol" aria-label="Trust">
        <h4>Trust</h4>
        <ul>
          <li><a href="#trust">Trust model</a></li>
          <li><a href="#how">How listing works</a></li>
          <li><a href="#sellers">Get listed</a></li>
        </ul>
      </nav>
    </div>
    <div class="lx-bottombar">
      <span>© 2026 Enzo Vezzaro · MIT License</span>
      <span class="lx-socials">
        <a href="https://github.com/EnzoVezzaro/reposell-listing" target="_blank" rel="noopener">GitHub</a>
        <a href="https://github.com/EnzoVezzaro/reposell-listing/issues" target="_blank" rel="noopener">Issues</a>
      </span>
      <VersionChip />
    </div>
  </div>
</footer>
