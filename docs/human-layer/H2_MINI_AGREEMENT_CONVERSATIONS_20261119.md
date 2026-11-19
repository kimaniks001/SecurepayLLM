# Mini H2 — Agreement Conversation inside a real Living Agreement

**H2 of 8. Draft, not deployed; Mini only.**

## What changed

The **real, authenticated** Mini Living Agreement screen now has a prominent **Conversation** tab on desktop and a **Chat** primary doorway on phones. It is part of the same Agreement detail next to Overview, People, Money and Progress. Demo fixture screens keep the original navigation because they do not have canonical authenticated message records.

The pane reuses the B4 canonical server protocol and B4 message-thread UI pattern, with real GET/POST only:
- GET \`/api/v1/agreements/{id}/messages?page=0&size=20\`
- POST \`/api/v1/agreements/{id}/messages\` with \`clientMessageId\` stable on uncertain retry.
- Only a signed-in original Agreement participant may read/write as authorized by server. The server chooses sender and access.
- No fake history, fabricated participants, simulated live messages or invented notifications.
- No signed Contract changes or Money authority come from a message.
- A failed read displays a truthful error, not invented messages. An uncertain send keeps its original idempotency key.

## Real wiring

\`RuntimeApp\` -> authenticated \`createSecurePayApi().agreementMessages\` -> \`AgentExperience\` -> real \`WorkspaceExperience\` -> \`AgreementDetail\` Conversation tab -> \`AgreementConversationPanel\`.

The old B4 Mini PR #313 includes overlapping gateway and message panel work. H2 reuses their protocol rather than creating a new chat store; reconcile both implementations before merge. Canonical backend B4 #472 and B5 #473 are still unmerged and are not live. H1 Mini #352 remains H2's base.

## Important unfinished items

**No working real A/B participant chat has been certified.** The backend endpoint and notification outbox are draft dependencies. H2 code cannot imply that a message was delivered when server persistence cannot be confirmed. No live customer preview URL or production release is claimed.

Text-only H2; attachment upload, voice clips, quiet notifications, unread indicators, search from conversation, user moderation and fully trusted display names require further verified convergence. The existing Agreement activity and Money records remain separately authoritative.

## Test and release gates

In complete checkout: \`node --test tests/human-layer-h2-conversations.test.mjs\`, \`npm run typecheck\`, \`npm run build\`, affected Mini regression suites; Java21/Flyway/PostgreSQL/three-identity B4/B5 testing; no unauthorized C access, no stale session leaks, same-key resend idempotency, and original Agreement/linked Plug task privacy. Do not merge or deploy without genuine evidence.

**Only SecurePay Mini is a preview target.** Do not route users to Living Workspace or the old Business UI and call it Mini.
