# KS001 media and tool uploads — local selection, visible transfer, verified source state

**Date:** 27 October 2026  
**Branch:** `feature/media-upload-status-and-add-to-ks001-20261027`  
**Status:** Draft parallel UI track. Do not merge, deploy or modify Paul's frozen C6 release images.

## Approved journey

1. Person chooses an image, camera capture, document or spreadsheet. Selection and any thumbnail/text preview stay **local**; a filename is never proof that the server received anything.
2. Person presses **Add to KS001**. This is explicit consent to upload to the current SecurePay conversation. In Home, a new intention goes through the existing start-fresh/continue guard. In chat, the same source controller and existing conversation are used. No new conversation controller.
3. Display an accessible, indeterminate **Uploading to SecurePay…** progress bar while the genuine multipart request is in progress. The existing fetch transport **does not expose byte-level upload progress**; do not show fabricated percentages. Browser authentication, anonymous conversation token, form-data boundaries, current sizes and MIME validation remain unchanged.
4. Upon a verified server source receipt, switch to **SecurePay is reading…**. `RECEIVED` and `PROCESSING` are not `READY`. The shared SourceController performs bounded status checks. The Tool Shelf also offers **Check reading status** without re-uploading a file.
5. Show the actual `READY` or `PARTIAL` candidate findings with uncertainties; only then enable existing KS001 source follow-up actions. A `FAILED` extraction shows its actual failure and the existing source-id retry; an unknown upload remains unknown rather than falsely successful.
6. Vision file saving has its **own** indeterminate saving indicator and its own access/asset limits. A Vision asset is not implicitly read by KS001 or accepted as Agreement evidence.

## Scope

Implemented in: `UniversalSourceTray` (Photos, Documents, Camera and Vision), `AgentExperience` (Home and chat source pickers), `SourceController` (uploading vs checking states), reusable `UploadStatusBar`, and regression tests.

No change to Plus Codes/Places authority, Date/Time structured input, identity, source scanner, backend storage, agreement permissions or Money.

## Independent blocker: source understanding

The backend currently has a distinct `AnthropicSourceUnderstandingAdapter`. Running OpenAI for the conversational KS001 model **does not** configure source understanding. An HTTP 201 response only establishes that the source endpoint returned a source receipt; it does not establish that the file was read. Paul's earlier controlled test found missing source-provider credentials and a provider circuit-breaker failure. Fix that backend/configuration issue independently; this PR only makes that truth visible.

## Tests and release gates

- Unit tests cover source controller transfer→processing→ready and uploaded-but-unread failure.
- Component tests check the accessibility and truthful indeterminate bars.
- Existing Phase 1, True North and Entry Perfection contract assertions updated from Send/auto-upload to explicit Add.
- Final UI, Vision, Fair Trade & Tool Shelf workflows must pass on the exact head, and native mobile/device uploads must be verified in isolated staging.
- Day 1 Gate D may remain **intentionally blocked** until real staging upload, scan, source reading, privacy/auth and mobile screenshots are attached; do not bypass that gate.
- Do not automatically re-upload after a disconnected request whose outcome is unknown without checking existing sources first.

**Intentionally not built:** a separate private pre-upload staging endpoint that uploads files into SecurePay *without* triggering KS001 source ingestion. The current backend combines upload and processing; adding a post-upload approval action would require a new server-side holding store and data lifecycle, which should be separately designed and approved.
