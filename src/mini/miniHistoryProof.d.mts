import type { AgentState } from '../features/agent/controller';
import type { ConversationHistoryResponseDto } from '../api/securepay/agent/dto';
export declare function miniHistoryRestored(
  history: ConversationHistoryResponseDto | null,
  state: AgentState,
  expectedConversationId: string
): boolean;
