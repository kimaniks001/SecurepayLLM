import type { AgentController } from '../agent/controller';

/**
 * User-Ready Beta Gate 1 (EP-CERT-002) -- THE PERSON'S CORRECTION MUST REMAIN UNTIL SUCCESS IS KNOWN.
 *
 *  ok       -- SecurePay processed it and re-read the canonical understanding: clear the input, show KS001's acknowledgement.
 *  failed   -- it definitely did not go through: keep the words, offer a safe retry.
 *  unknown  -- the connection dropped / the server is still working: keep the words and CHECK (the same clientTurnId is
 *              re-sent, so it can never apply twice) -- the person never retypes.
 *  blocked  -- an earlier message has not gone through yet: keep the words; that earlier one is retried first.
 */
export type CorrectionOutcome =
  | { status: 'ok'; acknowledgement: string | null }
  | { status: 'failed' | 'unknown' | 'blocked'; message: string };

type Agent = Pick<AgentController, 'sendStatement' | 'retry' | 'getSnapshot'>;

export const CORRECTION_UNKNOWN_TEXT = 'SecurePay couldn’t confirm your correction went through. It’s still here — check again; it won’t be applied twice.';
export const CORRECTION_BLOCKED_TEXT = 'An earlier message hasn’t gone through yet. Send that one first — your correction is kept here.';

function latestReply(agent: Agent): string | null {
  const turns = agent.getSnapshot().turns;
  const last = turns[turns.length - 1];
  return last && last.sender === 'agent' ? last.response.message.text : null;
}

function outcomeAfterFailure(agent: Agent, error: string): CorrectionOutcome {
  const snapshot = agent.getSnapshot();
  if (snapshot.outcomeUnknown) return { status: 'unknown', message: CORRECTION_UNKNOWN_TEXT };
  return { status: 'failed', message: error };
}

export async function submitCorrection(agent: Agent, text: string): Promise<CorrectionOutcome> {
  const before = agent.getSnapshot();
  if (before.pending && !before.busy) return { status: 'blocked', message: CORRECTION_BLOCKED_TEXT };
  const result = await agent.sendStatement(text);
  if (result.ok) return { status: 'ok', acknowledgement: latestReply(agent) };
  return outcomeAfterFailure(agent, result.error);
}

/** Re-sends whatever is pending (the SAME clientTurnId) and reports whether it has now gone through. */
export async function retryPending(agent: Agent): Promise<CorrectionOutcome> {
  await agent.retry();
  const snapshot = agent.getSnapshot();
  if (!snapshot.pending) return { status: 'ok', acknowledgement: latestReply(agent) };
  return outcomeAfterFailure(agent, snapshot.error ?? 'That didn’t go through. Your correction is kept — please try again.');
}
