import { getApps, initializeApp, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';

let _app: App | null = null;
let _auth: Auth | null = null;
let _storage: Storage | null = null;

function getApp(): App {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0]!;
    return _app;
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    _app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    _app = initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
  return _app;
}

export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getApp());
    return Reflect.get(_auth, prop, _auth);
  },
});

export const adminStorage = new Proxy({} as Storage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(getApp());
    return Reflect.get(_storage, prop, _storage);
  },
});

export async function verifyIdToken(token: string) {
  return adminAuth.verifyIdToken(token);
}
