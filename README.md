# SecurePayLLM

Production frontend for the locked SecurePay experience.

## Source of truth

- **Experience authority:** frozen Bolt export through Pass 11.
- **Backend authority:** `kimaniks001/SecurePayAPI`.
- **Legacy reference only:** `kimaniks001/SecurepayBDUI`.

The production mandate is to preserve the approved Bolt experience while replacing demo/mock authority with real SecurePayAPI contracts. Do not import the legacy BDUI page architecture or reinterpret established journeys.

## Frozen Bolt reference

Uploaded export: `project-bolt-sb1-8wcnp3ss.zip`

SHA-256: `2f6c28bd28c80af806217e94e722f5b2498b187a865a44a3d0a7d9cbb0c5b14d`

The raw export must be committed unchanged before production refactoring begins.

## Core convergence rule

`Canonical source -> explicit Use this -> SourceReference -> Trade Taking Shape -> resolve delta -> Agreement authority -> Money follows Agreement`

## Foundation runtime

Copy `.env.example` for real API configuration. Real mode is the default and
currently shows unavailable until the Golden Spine UI slices are wired.
For the unchanged Bolt visual reference, run:

```sh
VITE_SECUREPAY_MODE=fixture npm run dev
```

Fixtures are disabled in production builds, including `#/demo/...` URLs.
API credentials must never be placed in `VITE_*` variables.

Validation: `npm run typecheck`, `npm run lint`, `npm run test:foundation`,
`npm run build`. See [the compatibility audit](docs/GOLDEN_SPINE_COMPATIBILITY_AUDIT.md)
for verified contracts, gaps and the next slice.
