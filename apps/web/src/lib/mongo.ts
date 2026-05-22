import { MongoClient, type Db, type Collection } from 'mongodb';
import type { Annotation, User, Comment, Claim, Follow } from '@annotate/shared';

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __mongoDbPromise: Promise<Db> | undefined;
}

function getClient(): MongoClient {
  if (global.__mongoClient) return global.__mongoClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const client = new MongoClient(uri);
  if (process.env.NODE_ENV !== 'production') global.__mongoClient = client;
  return client;
}

export function getDb(): Promise<Db> {
  if (!global.__mongoDbPromise) {
    const dbName = process.env.MONGODB_DB ?? 'annotate_db';
    global.__mongoDbPromise = getClient().connect().then((c) => c.db(dbName));
  }
  return global.__mongoDbPromise;
}

export async function annotations(): Promise<Collection<Annotation>> {
  return (await getDb()).collection<Annotation>('annotations');
}
export async function users(): Promise<Collection<User>> {
  return (await getDb()).collection<User>('users');
}
export async function comments(): Promise<Collection<Comment>> {
  return (await getDb()).collection<Comment>('comments');
}
export async function claims(): Promise<Collection<Claim>> {
  return (await getDb()).collection<Claim>('claims');
}
export async function follows(): Promise<Collection<Follow>> {
  return (await getDb()).collection<Follow>('follows');
}

export async function getAnnotationBySlug(slug: string): Promise<Annotation | null> {
  return (await annotations()).findOne({ slug });
}
