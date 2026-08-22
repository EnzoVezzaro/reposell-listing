# reposell Marketplace — Payment Integration (Static + CI)

## Architecture: Pure Static + CI

**No server, no API, no edge functions, no webhooks, no backend.** Pure static frontend + GitHub Actions CI.

## How It Works

```
Marketplace deployed to static host
        │
        ▼
Buyer browses products → Clicks "Buy"
        │
        ▼
┌─────────────────────────────┐
│ Stripe Embedded Checkout    │
│ (runs entirely in browser)  │
│                             │
│ Card | Apple Pay | Google   │
│                             │
│ [ Pay $49 ]                 │
└─────────────────────────────┘
        │
        ▼
    Stripe (handles everything)
        │
   ┌────┴─────┐
   ▼          ▼
Buyer      Seller (Connect)
             │
             ▼
       Automatic payout
       (from signed policy)
```

## Static Frontend Structure

```
marketplace/
├── index.html                 # Product catalog
├── product/[id].html          # Product detail + checkout
├── purchase/success.html      # Post-payment verification
├── assets/
│   ├── stripe-checkout.js     # Stripe.js + Embedded Checkout
│   ├── pricing-policy.js      # Fetches & verifies signed policy
│   └── trust-document.js      # Fetches & verifies trust doc
├── connect/
│   └── onboard.html           # Connect onboarding (static redirect)
└── .github/workflows/
    ├── verify.yml             # CI: verify pricing + trust (MUST PASS)
    ├── build.yml              # Build + test
    └── deploy.yml             # Deploy (depends on verify + build)
```

## Pricing Policy (Static Fetch + Verify)

```javascript
// pricing-policy.js
async function loadPricingPolicy() {
  const response = await fetch('https://reposell.dev/pricing.json');
  const policy = await response.json();
  
  // Verify Ed25519 signature using official public key
  const verified = await verifyEd25519(
    policy.signature,
    policy.key_id,
    OFFICIAL_PUBLIC_KEY
  );
  
  if (!verified) {
    throw new Error('Unverified pricing policy - entering safe state');
  }
  
  return policy;
}
```

## Trust Document (Static Fetch + Verify)

```javascript
// trust-document.js
async function loadTrustDocument() {
  const response = await fetch('https://reposell.dev/trust.json');
  const trust = await response.json();
  
  // Verify chain of signatures
  const verified = await verifyTrustChain(trust, ROOT_PUBLIC_KEY);
  
  if (!verified) {
    throw new Error('Unverified trust document');
  }
  
  return trust;
}
```

## Startup Verification (Runs on Page Load)

```javascript
// In main.js - runs before any purchase UI
async function initializeMarketplace() {
  try {
    const trust = await loadTrustDocument();
    const pricing = await loadPricingPolicy();
    
    // Cache with expiration
    sessionStorage.setItem('pricingPolicy', JSON.stringify(pricing));
    sessionStorage.setItem('trustDocument', JSON.stringify(trust));
    
    // Verify accounting test
    const test = calculateFees(5000, pricing);
    if (test.owner !== 4500 || test.main !== 250 || test.public !== 250) {
      throw new Error('Accounting test failed');
    }
    
    console.log('Marketplace initialized with verified policy');
  } catch (error) {
    // SAFE STATE - no fallback 50%
    document.body.innerHTML = `
      <div class="safe-state">
        <h1>Marketplace Unavailable</h1>
        <p>Unable to verify official pricing policy.</p>
        <p>Please contact the operator.</p>
      </div>
    `;
    throw error;
  }
}
```

## Stripe Connect (Static Onboarding)

```html
<!-- connect/onboard.html -->
<script src="https://js.stripe.com/v3/"></script>
<script>
  // Redirect to Stripe Connect OAuth for onboarding
  // Uses pre-configured Connect Client ID
  window.location.href = `https://connect.stripe.com/oauth/authorize?client_id=${CONNECT_CLIENT_ID}&response_type=code&scope=read_write`;
</script>
```

**Connect Onboarding**: Sellers click "Connect Stripe" → redirected to Stripe OAuth → returns to success page with connected account ID stored in static seller registry.

## CI Verification (Mandatory)

```yaml
# .github/workflows/verify.yml
name: Verify
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fetch official pricing policy
        run: curl -s https://reposell.dev/pricing.json > pricing.json
      - name: Verify pricing policy signature
        run: npx verify-ed25519 pricing.json
      - name: Fetch official trust document
        run: curl -s https://reposell.dev/trust.json > trust.json
      - name: Verify trust document
        run: npx verify-trust trust.json
      - name: Run accounting test
        run: node -e "
          const p = require('./pricing.json');
          const fees = calc(5000, p);
          if (fees.owner !== 4500 || fees.main !== 250 || fees.public !== 250) process.exit(1);
        "
```

## Static Hosting

```bash
# Build
npm run build

# Deploy to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.)
# No environment variables needed - config embedded at build time
```

## Configuration (Embedded at Build Time)

```javascript
// config.js (generated at build time)
window.REPOSELL_CONFIG = {
  stripePublishableKey: 'pk_test_...',        // Embedded at build
  stripeConnectClientId: 'ca_...',             // Embedded at build
  officialPricingUrl: 'https://reposell.dev/pricing.json',
  officialTrustUrl: 'https://reposell.dev/trust.json',
  officialPublicKey: 'base64...',              // Embedded at build
  pricingCacheTTL: 3600000                     // 1 hour
};
```

## Safe State UI

If verification fails, the marketplace shows:

```html
<div class="safe-state">
  <h1>Marketplace Temporarily Unavailable</h1>
  <p>Unable to verify official pricing policy from reposell.dev</p>
  <p>No purchases can be processed until verification is restored.</p>
  <p>Operator has been notified.</p>
</div>
```

**No fallback percentages. No silent failures. Hard stop.**