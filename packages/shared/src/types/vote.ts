export interface Vote {
  _id?: string;
  userId: string;
  annotationId: string;
  createdAt: Date | string;
}
