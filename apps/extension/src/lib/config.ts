// Web app base URL. In dev: localhost. In prod: production Annotate domain.
export const WEB_BASE_URL =
  (import.meta.env.VITE_WEB_BASE_URL as string | undefined) ?? 'https://annotate.metisos.co';

export const STORAGE_KEYS = {
  idToken: 'annotate.idToken',
  user: 'annotate.user',
} as const;
