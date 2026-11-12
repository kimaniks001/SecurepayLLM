/**
 * M3 first-party SecurePay Save/Resume display validation.
 * The server owns saved-build IDs, actor identity, privacy and every Agreement.
 * The UI can only verify returned identifiers before labelling something saved.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id=value=>typeof value==='string' && UUID.test(value);
export const miniOwnedBuildConfirmed=(build,expectedConversationId)=>
  !!build && id(build.savedBuildId) && id(build.conversationId) &&
  build.conversationId===expectedConversationId && typeof build.buildUpdatedAt==='string'
    ? {savedBuildId:build.savedBuildId,conversationId:build.conversationId} : null;
export function miniOwnedBuildList(items){
  if(!Array.isArray(items))return null;
  if(items.length>20)return null;
  if(items.some(item=>!item || !id(item.savedBuildId) || !id(item.conversationId) ||
     typeof item.buildUpdatedAt!=='string' || typeof item.title!=='string' && item.title!==null ||
     !Number.isInteger(item.openMatterCount) || item.openMatterCount<0)) return null;
  const seen=new Set();
  return items.map(item=>{
    if(seen.has(item.savedBuildId))return null;
    seen.add(item.savedBuildId);
    return {
      savedBuildId:item.savedBuildId,
      conversationId:item.conversationId,
      title:item.title?.trim().slice(0,100)||'Unfinished Agreement',
      openMatterCount:item.openMatterCount,
      sufficiencyState:typeof item.sufficiencyState==='string'?item.sufficiencyState:'UNKNOWN',
      buildUpdatedAt:item.buildUpdatedAt,
    };
  }).every(Boolean) ? items.map(item=>({
      savedBuildId:item.savedBuildId,
      conversationId:item.conversationId,
      title:item.title?.trim().slice(0,100)||'Unfinished Agreement',
      openMatterCount:item.openMatterCount,
      sufficiencyState:typeof item.sufficiencyState==='string'?item.sufficiencyState:'UNKNOWN',
      buildUpdatedAt:item.buildUpdatedAt,
  })) : null;
}
export const miniOwnedResumeConfirmed=(build,expectedSavedBuildId)=>
  !!build && id(build.savedBuildId) && id(build.conversationId) &&
  build.savedBuildId===expectedSavedBuildId ? build.conversationId : null;
