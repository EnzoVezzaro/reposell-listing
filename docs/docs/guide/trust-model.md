---
title: Trust Model
description: Trust flows from cryptography, not from vibes — signatures, rotation, and fail-closed design.
---

# Trust Model

Trust here flows from cryptography, not from vibes. Every fact on the listing traces back to a signature somebody's private key produced — and every verification path fails closed.

## What gets signed, and by whom

Two independent signing authorities, deliberately separated:

| Artifact | Signed by | Verified against |
| --- | --- | --- |
| Repository & release manifests | The repository owner's Ed25519 key | Public key published in the owner's repo |
| Pricing policy documents | The official reposell key | The official verification key |
| Trust documents (key rotation) | The official reposell key | The currently trusted official key |

Signatures cover canonical JSON bodies. Tampering with a single byte breaks them loudly — which is why CI refuses to read product facts from anywhere except a signed manifest fetched live from the seller.

## The official verification key

There is exactly one official verification key. Community listings, CI pipelines and tooling embed the **public** half and verify everything the official side signs. The private half never touches Git, CI artifacts, logs, or any machine that talks to the internet on a schedule. If a document does not verify against the official key, it is not official policy — no matter how confident it sounds.

## Key rotation without rewriting history

Keys rotate through **signed trust documents**: each document lists active, revoked and expired keys with activation and expiry dates, signed by the currently trusted official key. Verification walks that chain, so history stays verifiable even after keys change. Old signatures remain valid against the key that made them; revocation is explicit and dated, never silent.

## Fail closed, everywhere

Every verification step follows the same rule:

```text
Fetch → Verify signature → Validate schema → Validate freshness → Accept
```

Invalid at any step → **BLOCKED**. No fallback values, no "assume valid while we look into it", no grace period for bad signatures. CI treats an unreachable endpoint and a forged manifest identically: unverifiable equals rejected. Runtime follows the same philosophy — a component that cannot validate the configuration it consumed enters a safe state rather than guessing.

## What the listing will never do

- **Invent fees.** Pricing lives in separately signed policy documents. Listings physically cannot quietly bump numbers.
- **List unverified products.** Signatures are checked against the official key before anything renders. Nobody makes that call by hand.
- **Hold your keys.** Signing happens in your repository, with your key, under your control. The listing sees public keys and signatures, never private material.
- **Sell your software.** Discovery and verification only — `/sell` stays yours, and you keep 100% of your price.

## Trust domains stay separate

GitHub, Stripe, static hosting, the repository and the listing itself are distinct trust domains. No component implicitly trusts another:

- CI trusts a product fact only after the seller's signature checks out against data fetched live.
- The frontend trusts catalog JSON only because CI produced it from verified inputs.
- Community listings trust official policy only after verifying it with the official public key.

Compromise one domain and the others still notice.

## Verify it yourself

Nothing here requires trusting the frontend. Manifests, trust documents and generated records are plain signed JSON in an open registry — clone it, check the signatures against the official public key, and see for yourself.

Selling something? Start with [publishing](/guide/publishing). Building your own view of the network? See [self-hosting](/guide/self-hosting).
