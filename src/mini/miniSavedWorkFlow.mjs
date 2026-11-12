import {miniOwnedBuildConfirmed,miniOwnedBuildList,miniOwnedResumeConfirmed} from './miniOwnedWork.mjs';
import {miniHistoryRestored} from './miniHistoryProof.mjs';

/**
 * Real API workflows, deliberately supplied with the one canonical Agent
 * gateway/controller. No mocks or fixtures are imported into production Mini.
 * Identity refresh and auth are enforced independently by the caller/session
 * and SecurePayAPI; this never turns a saved draft into an accepted Agreement.
 */
export async function miniSaveServerBuild(gateway,conversationId) {
  if(typeof conversationId!=='string' || !conversationId)throw Error('No conversation to save');
  const saved=await gateway.saveBuild(conversationId);
  const verified=miniOwnedBuildConfirmed(saved,conversationId);
  if(!verified)throw Error('SecurePay did not confirm the saved conversation');
  return verified;
}
export async function miniListServerBuilds(gateway) {
  const items=await gateway.listSavedBuilds(20,0);
  const verified=miniOwnedBuildList(items);
  if(!verified)throw Error('SecurePay did not confirm the saved-work list');
  return verified;
}
export async function miniResumeServerBuild(gateway,controller,savedBuildId) {
  const saved=await gateway.resumeSavedBuild(savedBuildId);
  const original=miniOwnedResumeConfirmed(saved,savedBuildId);
  if(!original)throw Error('SecurePay did not confirm the original conversation');
  const history=await gateway.conversationHistory(original);
  if(!history || !Array.isArray(history.entries))throw Error('Original history was not available');
  await controller.resumeConversation(original,history);
  if(!miniHistoryRestored(history,controller.getSnapshot(),original))
    throw Error('Original conversation and context do not match');
  return original;
}
