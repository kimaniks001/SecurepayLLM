# H3 Mini — Help & Resolution (phone-first) | 19 November 2026

**Draft user experience. Only Mini is the design preview target.**

### Customer journey
A calm **Need a hand?** experience is available throughout Buy, Sell, Pay and Collect. It does not presuppose conflict. The person can choose answer pills for understanding the Agreement, talking to another human, local knowledge, simple fact-finding, expert advice or something going wrong. KS001 guides fairly but can never adjudicate or rewrite terms.

### Actual core integration
The existing authenticated Mini Help screen calls the **shared** `/api/v1/human-layer/help/triage` gateway; source Agreement and its current version are freshly read, not trusted as old navigation state. The response states no case/human contact/Agreement amendment/Money authorization happened. Core H3 API is still a draft branch; if unavailable, the customer sees an honest error and can still ask KS001 through existing mechanisms.

### Review-only entrance
`#/preview/mini/h3` displays the H3 **Mini** phone-first interactive sample. It works without login but is deliberately local: journeys, answer pills and choices change only the sample screen, not any server record. No fabricated live Plugs, Masters, human bookings, KS001 model conclusions, verified site facts, prices, disputes, or payment success. Preserve the H2 Mini preview at `#/preview/mini/h2`. The Living Workspace can be opened only at its explicit separate route.

### Next gates
Review human usability, responsiveness and sample disclaimers; run Vite/TS and Node suite; deploy the H3 API into an **isolated** backend with real actor authority; verify API denial for unrelated actor and stale version; certify full integrated H1–H3 with B4/B5, legal/funded agreement and payment boundaries. Only then can customer-ready help routing be claimed; H4/H5/H6 needed for actual verified provider coordination.
