# Per-seller domains with registry-backed dynamic CORS

Each white-label seller's families reach the companion app at the **seller's own branded domain**. All seller domains serve a **single Vercel deploy**; the active brand is resolved from the request hostname. This requires expanding `API.md`'s **single fixed `FRONTEND_ORIGIN`** into a **registry-backed CORS allowlist** — the gateway reflects the request `Origin` only when it matches a registered seller domain.

Without this, white-label is cosmetic: sellers' customers would see the platform's domain, not the seller's.

## Considered Options

- **Single shared app domain** (`API.md` literal, one origin) — simplest, brand resolved after login, but no seller-branded URL. Weakest white-label.
- **Subdomains + wildcard CORS** (`seller.hush.io`, `*.hush.io`) — branded-ish, one cert, but sellers don't get their own root domain.

## Consequences

- Per-seller domain onboarding (DNS + cert; Vercel automates certs) becomes an operational step.
- CORS is no longer static config — the gateway must read the seller-domain registry. `credentials` stays off (no cookies), so the allowlist only governs `Origin` reflection + header allowance.
