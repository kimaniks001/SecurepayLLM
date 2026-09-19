# Bolt Pass 11 Import Checkpoint

Target branch: `feat/import-bolt-pass11`

Uploaded chat artifact inspected locally:

- file: `project-bolt-sb1-8wcnp3ss.zip`
- SHA-256: `2f6c28bd28c80af806217e94e722f5b2498b187a865a44a3d0a7d9cbb0c5b14d`
- 177 files
- 160 `src/` files
- 146 components
- 99 explicit demo/acceptance routes

The GitHub connector can create/edit repository text and Git objects but cannot transfer a local binary chat attachment directly into GitHub. The import script at `scripts/import-bolt-reference.sh` is already checksum-locked to this exact export.

Once the ZIP is present at the repository root on this branch, run:

```bash
bash scripts/import-bolt-reference.sh project-bolt-sb1-8wcnp3ss.zip
npm ci
npm run typecheck
npm run lint
npm run build
```

Then commit the expanded Bolt source without refactoring it. That commit is the immutable experience-reference commit. Production code should branch only after this checkpoint exists.

Do not remove or clean mocks during the import commit. `src/mockAgent.ts` and the demo data files remain part of the reference and are retired incrementally by later production vertical slices.
