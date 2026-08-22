# feature.md — Add a new marketplace feature

1. Isolate the functionality: identify the directory boundary (e.g., `src/payments/`, `src/auth/`).
2. Read the parent AGENTS.md to understand inheritable context.
3. Create `<dir>/AGENTS.md` (use `acc document <dir>` for a template).
4. Implement the feature following the domain/application/infrastructure layers.
5. Add API routes in `src/api/v1/`.
6. Add database migrations if needed.
7. Run `acc check` to validate references and contracts.
8. Run `acc graph` to confirm relationships match intent.
9. Run `acc impact <dir>` to identify affected tests/dependents.
10. Update `.acc-memory.md` with what you learned.

## Sub-steps

### API Route Structure

```typescript
// src/api/v1/payments/[route].ts
import { Hono } from 'hono';
import { authenticate } from '../auth';
import { verifyStripeWebhook } from '../crypto';

const app = new Hono();
app.use('/webhooks', authenticate);

app.post('/checkout', async (c) => {
  // Implement checkout
});

app.post('/webhooks/stripe', async (c) => {
  // Implement webhook verification
});

export const GET = async (c) => {
  // Implement GET
  return c.json({});
};
```

### Test Structure

```typescript
// tests/integration/payments.test.ts
import { describe, test, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('payments', () => {
  test('creates a checkout session', async () => {
    // Test implementation
  });
});
```