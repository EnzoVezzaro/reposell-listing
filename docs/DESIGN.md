# Design

> **Implementation note:** VitePress DefaultTheme re-skinned via CSS variables in `branding/theme/styles/variables.css` + `custom.css` (motion.dev-derived lab system: paper+ink, electric-yellow CTA, blackcurrant links, aurora dark mode, wipe/rise/ticker animations). See `reposell/docs/DESIGN.md` for the canonical token sheet.

## Color

Inherits full palette from root DESIGN.md (signal/verified/pending/invalid). Listing-specific semantic usage:

- **Signal** — Primary actions (Buy, Publish, Register)
- **Verified** — Verified badges, valid signatures, active licenses
- **Pending** — Syncing manifests, pending reviews, unpaid invoices
- **Invalid** — Failed verifications, expired licenses, revoked keys

## Typography

Inherits font stack from root. Listing-specific:
- **Data tables**: Geist Mono (tabular-nums) for prices, splits, timestamps
- **Manifest hashes/keys**: Geist Mono at --text-xs
- **Pricing displays**: Syne at --text-2xl with tabular-nums

## Components

### Product Card (listing grid)

```css
.product-card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  gap: var(--space-4);
  transition: border-color var(--duration-base) var(--ease-out),
              box-shadow var(--duration-base) var(--ease-out);
}
.product-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}
.product-card.verified {
  border-color: var(--color-verified);
  box-shadow: 0 0 0 1px var(--color-verified);
}
```

### Verification Badge

```css
.verification-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}
.verification-badge.verified {
  background: var(--color-verified-muted);
  color: var(--color-verified);
}
.verification-badge.pending {
  background: var(--color-pending-muted);
  color: var(--color-pending-fg);
}
.verification-badge.invalid {
  background: var(--color-invalid-muted);
  color: var(--color-invalid);
}
```

### Pricing Display

```css
.pricing-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
}
.price-total { font-size: var(--text-xl); font-weight: 700; color: var(--color-fg); }
.price-split { font-size: var(--text-sm); color: var(--color-fg-muted); }
.fee-badge { font-size: var(--text-xs); padding: 2px 6px; border-radius: var(--radius-sm); }
```

### Manifest Status Indicator

```css
.manifest-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1.5);
  font-size: var(--text-sm);
  font-weight: 500;
}
.manifest-status::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.manifest-status.verified { color: var(--color-verified); }
.manifest-status.pending { color: var(--color-pending); }
.manifest-status.invalid { color: var(--color-invalid); }
```

### Search/Filter Bar

```css
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-4);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-6);
}
.filter-input { flex: 1; min-width: 200px; }
.filter-select { min-width: 140px; }
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
}
.filter-chip.active {
  background: var(--color-signal-muted);
  border-color: var(--color-signal);
  color: var(--color-signal);
}
```

### License Card

```css
.license-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
}
.license-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}
.license-key {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--color-bg-alt);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  word-break: break-all;
}
.license-status { /* uses verification-badge */ }
.license-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
  font-size: var(--text-sm);
}
.license-meta dt { color: var(--color-fg-muted); font-weight: 500; }
.license-meta dd { color: var(--color-fg); font-family: var(--font-data); font-variant-numeric: tabular-nums; }
```

## Layout

### Dashboard Grid

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
  min-height: calc(100vh - var(--vp-nav-height));
}
@media (max-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
```

### Listing Grid

```css
.listing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-5);
}
@media (max-width: 640px) {
  .listing-grid { grid-template-columns: 1fr; }
}
```

## Motion

- **List filtering**: 180ms ease-out crossfade
- **Verification status change**: Pulse animation on badge (verified only)
- **Price calculation**: Number ticker animation (tabular-nums)
- **Reduced motion**: Instant state swaps

## Sound Effects

- `purchase-complete` — verify-success + soft chime
- `license-issued` — verify-success
- `verification-failed` — verify-fail
- `manifest-synced` — deploy