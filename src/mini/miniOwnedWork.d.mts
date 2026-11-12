import type { SavedBuildDto } from '../api/securepay/agent/dto';
export interface MiniSavedWorkItem {
  savedBuildId:string;conversationId:string;title:string;openMatterCount:number;
  sufficiencyState:string;buildUpdatedAt:string;
}
export declare function miniOwnedBuildConfirmed(build:SavedBuildDto,expectedConversationId:string):{
  savedBuildId:string;conversationId:string;
}|null;
export declare function miniOwnedBuildList(items:SavedBuildDto[]):MiniSavedWorkItem[]|null;
export declare function miniOwnedResumeConfirmed(build:SavedBuildDto,expectedSavedBuildId:string):string|null;
