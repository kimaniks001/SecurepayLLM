export type SellerReviewPillAction =
  | 'documents' | 'photos' | 'describe' | 'submitted'
  | 'save' | 'remove' | 'help' | 'wait';
export type SellerReviewPill = {
  id: SellerReviewPillAction;
  label: string;
};
export type SellerReviewPillSet = {
  status: string;
  question: string;
  detail: string;
  pills: SellerReviewPill[];
  canPublish: false;
  canIssueIdentimark: false;
};
export function miniSellerReviewAnswerPills(status: string,
  topic?: string | null): SellerReviewPillSet | null;
