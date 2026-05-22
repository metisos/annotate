import { WEB_BASE_URL, STORAGE_KEYS } from './config';

export type StoredUser = {
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  firebaseUid?: string;
};

/**
 * Open the web /sign-in in a new tab and poll /api/auth/session until the
 * session cookie shows up. Using `credentials: 'include'` keeps it cross-origin
 * (chrome-extension:// → http://localhost:3100 / production host).
 *
 * Why this instead of chrome.identity.launchWebAuthFlow + signInWithPopup?
 * signInWithPopup inside the launchWebAuthFlow auth-window doesn't reliably
 * close back to the outer window; users see a stuck "Signing in…" state.
 */
export async function signIn(): Promise<{ user: StoredUser }> {
  const tab = await chrome.tabs.create({ url: `${WEB_BASE_URL}/sign-in?from=ext` });

  // Poll the session endpoint until a user is present, or the user gives up.
  const start = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000;
  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const res = await fetch(`${WEB_BASE_URL}/api/auth/session`, { credentials: 'include' });
      if (res.ok) {
        const j = (await res.json()) as {
          user: { handle: string; displayName?: string; avatarUrl?: string; firebaseUid?: string } | null;
        };
        if (j.user) {
          const user: StoredUser = {
            handle: j.user.handle,
            displayName: j.user.displayName,
            avatarUrl: j.user.avatarUrl,
            firebaseUid: j.user.firebaseUid,
          };
          await chrome.storage.local.set({ [STORAGE_KEYS.user]: user });
          // Close the sign-in tab if it still points to /sign-in or /u/...
          if (tab.id !== undefined) {
            try {
              const current = await chrome.tabs.get(tab.id);
              if (current.url?.includes('/sign-in') || current.url?.includes('/u/')) {
                await chrome.tabs.remove(tab.id);
              }
            } catch {
              /* tab already closed */
            }
          }
          return { user };
        }
      }
    } catch {
      /* transient — keep polling */
    }
  }

  throw new Error('Sign-in timed out. Please try again.');
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.user]);
  return (result[STORAGE_KEYS.user] as StoredUser | undefined) ?? null;
}

/**
 * On panel mount, check the web's /api/auth/session — if the user already has
 * a session cookie on the web (signed in in a previous browser tab), pull
 * their user info and store it locally so we don't make them click sign-in.
 */
export async function checkWebSession(): Promise<StoredUser | null> {
  try {
    const res = await fetch(`${WEB_BASE_URL}/api/auth/session`, { credentials: 'include' });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      user: { handle: string; displayName?: string; avatarUrl?: string; firebaseUid?: string } | null;
    };
    if (!j.user) return null;
    const user: StoredUser = {
      handle: j.user.handle,
      displayName: j.user.displayName,
      avatarUrl: j.user.avatarUrl,
      firebaseUid: j.user.firebaseUid,
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.user]: user });
    return user;
  } catch {
    return null;
  }
}

/**
 * Kept for the cookie+token-aware API client. With the cookie-only flow we
 * don't actually need the ID token, but call sites can fall back to it.
 */
export async function getStoredIdToken(): Promise<string | null> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.idToken]);
  return (result[STORAGE_KEYS.idToken] as string | undefined) ?? null;
}

export async function signOut(): Promise<void> {
  // Best-effort: clear the web session cookie too
  try {
    await fetch(`${WEB_BASE_URL}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    /* offline — fine */
  }
  await chrome.storage.local.remove([STORAGE_KEYS.idToken, STORAGE_KEYS.user]);
}
