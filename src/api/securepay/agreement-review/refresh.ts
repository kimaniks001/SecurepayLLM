import type { createAgreementReviewGateway } from '.';

type Methods<F extends (...args: never[]) => unknown> = readonly (keyof ReturnType<F>)[];

/**
 * Every Agreement Review participant method is `auth: 'required'`, so each must be wrapped by `withSessionRefresh`. RuntimeApp wraps the gateway from THIS
 * table; `tests/ui-phase9.test.mjs` parses the gateway source and fails if a method is added without being listed (no hand-copied list).
 * There are no public/unauthenticated Review methods.
 */
export const REVIEW_AUTHENTICATED_METHODS = ['list', 'detail', 'evidence', 'acknowledge', 'respond', 'submitEvidence', 'requestEscalation', 'v2Preflight', 'v2Open', 'v2Cases'] as const satisfies Methods<typeof createAgreementReviewGateway>;
