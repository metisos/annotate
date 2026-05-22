export type ClaimStatus = 'pending' | 'reviewed' | 'dismissed' | 'removed';

export interface Claim {
  _id?: string;
  annotationId: string;
  claimantName: string;
  claimantEmail: string;
  originalContentUrl: string;
  reason: string;
  evidence?: string;
  status: ClaimStatus;
  createdAt: Date | string;
  reviewedAt?: Date | string;
  reviewNotes?: string;
}
