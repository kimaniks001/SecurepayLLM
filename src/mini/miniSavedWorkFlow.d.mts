import type { AgentGateway } from '../api/securepay/agent';
import type { AgentController } from '../features/agent/controller';
import type { MiniSavedWorkItem } from './miniOwnedWork.mjs';
export declare function miniSaveServerBuild(
  gateway:Pick<AgentGateway,'saveBuild'>,conversationId:string
):Promise<{savedBuildId:string;conversationId:string}>;
export declare function miniListServerBuilds(
  gateway:Pick<AgentGateway,'listSavedBuilds'>
):Promise<MiniSavedWorkItem[]>;
export declare function miniResumeServerBuild(
  gateway:Pick<AgentGateway,'resumeSavedBuild'|'conversationHistory'>,
  controller:Pick<AgentController,'resumeConversation'|'getSnapshot'>,
  savedBuildId:string
):Promise<string>;
