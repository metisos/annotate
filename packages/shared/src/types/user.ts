export type AuthProvider = 'google' | 'twitter';

export interface User {
  _id?: string;
  firebaseUid: string;
  provider: AuthProvider;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
  link?: string;
  followerCount: number;
  followingCount: number;
  annotationCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Follow {
  _id?: string;
  followerId: string;
  followingId: string;
  createdAt: Date | string;
}
