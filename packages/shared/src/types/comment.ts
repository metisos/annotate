export interface Comment {
  _id?: string;
  annotationId: string;
  userId: string;
  parentId: string | null;
  text: string;
  createdAt: Date | string;
}
