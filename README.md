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
