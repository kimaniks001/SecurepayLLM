export interface CollectionTurn {stage:string;answer:string}
export interface CollectionInterview {
  stage:string;
  answers:Record<string,string>;
  turns:CollectionTurn[];
  lastError:string;
}
export interface CollectionChoice {id:string;label:string}
export interface CollectionQuestion {
  text:string;
  note:string;
  options:CollectionChoice[];
  placeholder?:string;
  inputMode?:string;
}
export interface CollectionReview {
  beneficiary:string;
  purpose:string;
  consent:string;
  recipient:string;
  target:string;
  reporting:string;
  disclosure:string;
  checks:string[];
  publishable:false;
  paid:false;
  agreementAccepted:false;
}
export interface CollectionDraft {
  description:string;
  amount:string;
  note:string;
}
export declare const COLLECT_STAGES: readonly string[];
export declare function startCollectInterview(seed?:string):CollectionInterview;
export declare function collectQuestion(state:CollectionInterview):CollectionQuestion;
export declare function answerCollectInterview(state:CollectionInterview,value:string):CollectionInterview;
export declare function collectionReview(state:CollectionInterview):CollectionReview|null;
export declare function proposedCollectionDraft(state:CollectionInterview):CollectionDraft|null;
