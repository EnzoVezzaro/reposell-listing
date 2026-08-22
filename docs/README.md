# reposell Marketplace (Official)

## Official Marketplace - reposell.dev

The official reposell marketplace is the authoritative marketplace service for the reposell protocol. Anyone can deploy a public marketplace instance, but the official service provides the reference implementation for pricing, trust, and settlement.

### Default Domain

All endpoints and references use `https://reposell.dev` as the default domain:

- **Pricing**: `https://reposell.dev/pricing.json`
- **Trust**: `https://reposell.dev/trust.json`
- **Verification Key**: `https://reposell.dev/config/reposell/verification-key.pub`

### Quickstart

```bash
# Deploy the official marketplace (Static frontend on Vercel/Netlify/Cloudflare Pages)

# Register a public marketplace instance (static form)
# Fill out registration form at https://reposell.dev/register
```

### Protocol Version

Current: **1.0**

All manifests include:
```json
{
  "protocol": "reposell-marketplace",
  "version": "1.0"
}
```

### Core Services (Static Files)

| Service | File | Description |
|---------|------|-------------|
| Pricing Policy | `pricing.json` | Signed pricing policy |
| Trust Document | `trust.json` | Key rotation metadata |
| Verification Key | `config/reposell/verification-key.pub` | Official Ed25519 public key |

### AI Contribution Verification

If you use AI assistance contributing to this project, add `.github/pr.yml` declaring the harness, provider, and model. CI verifies against `.github/pr_allow_providers.yml`.

```yaml
# Example .github/pr.yml
harness: opencode
provider: google
model: gemini-2.5-flash
```

```yaml
# Example .github/pr_allow_providers.yml
providers:
  google:
    free_api_access: true
    models:
      gemini-2.5-flash:
        free_model: true
harnesses:
  opencode:
    allowed: true
    free_tier: true
```

### AI-Assisted PR Verification

CI then verifies the harness, provider, and model against this policy and posts the result as a bot comment.

This isn't about judging how contributors work. It's about transparency and experimentation. We want this project to be a living demonstration of what the open-source community can build with freely available tools.

> **We don't tell contributors which AI they must use. We ask them to tell us what they used, and we verify it.**

See the full [AI contributions specification](https://github.com/EnzoVezzaro/agents-code-context/blob/main/docs/ai-contributions.md).

### License

MIT - see LICENSE for details.