/**
 * Conversation auto-follow, as a pure model so it can be tested without a browser.
 *
 * The rule: the conversation FOLLOWS the latest thing (the person's own message, KS001 thinking,
 * KS001's reply) for as long as the person is at, or near, the bottom. The moment they deliberately
 * scroll up to read history, following STOPS and is never forced back -- a "New reply" affordance
 * appears instead, and following resumes only when they return to the bottom or tap it.
 *
 * Two thresholds (hysteresis) keep this from flickering: it takes a real upward scroll to release
 * (RELEASE_PX) but only being close to the bottom to re-engage (STICK_PX). No timers anywhere.
 */
export interface ScrollMetrics { scrollTop: number; clientHeight: number; scrollHeight: number }
export const STICK_PX = 64;
export const RELEASE_PX = 96;

export const distanceFromBottom = (m: ScrollMetrics): number => m.scrollHeight - m.clientHeight - m.scrollTop;
export const bottomTop = (m: Pick<ScrollMetrics, 'clientHeight' | 'scrollHeight'>): number => Math.max(0, m.scrollHeight - m.clientHeight);

export interface FollowState { following: boolean; unread: boolean }
export type FollowEvent =
  | { type: 'sent' }                       // the person sent something: they want to see it and the answer
  | { type: 'reply' }                      // KS001's reply arrived
  | { type: 'scrolled'; metrics: ScrollMetrics }
  | { type: 'jump' };                      // the person tapped "New reply"

export const initialFollow: FollowState = { following: true, unread: false };

export function followReducer(state: FollowState, event: FollowEvent): FollowState {
  switch (event.type) {
    case 'sent': case 'jump': return { following: true, unread: false };
    case 'reply': return state.following ? state : { following: false, unread: true };
    case 'scrolled': {
      const distance = distanceFromBottom(event.metrics);
      const following = state.following ? distance <= RELEASE_PX : distance <= STICK_PX;
      const unread = following ? false : state.unread;
      return following === state.following && unread === state.unread ? state : { following, unread };
    }
  }
}

/**
 * Where to scroll when a reply arrives while following. A short reply is simply brought fully into
 * view (scroll to the bottom). A reply taller than the viewport is scrolled to its FIRST line, so
 * the person starts reading at the beginning rather than being dropped at the end of a long answer.
 */
export function replyScrollTop(reply: { top: number; height: number }, m: Pick<ScrollMetrics, 'clientHeight' | 'scrollHeight'>, padding = 12): { top: number; pinnedToReplyStart: boolean } {
  const bottom = bottomTop(m);
  if (reply.height + padding * 2 <= m.clientHeight) return { top: bottom, pinnedToReplyStart: false };
  return { top: Math.min(bottom, Math.max(0, reply.top - padding)), pinnedToReplyStart: true };
}
