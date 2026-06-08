export const LOCAL_AUTH_PROVIDER = 'local';

export type UserAuthFields = {
  provider?: string | null;
};

/** Users-permissions /auth/local only matches provider "local". */
export function ensureLocalProvider<T extends UserAuthFields>(data: T): T {
  if (!data.provider) {
    data.provider = LOCAL_AUTH_PROVIDER;
  }
  return data;
}
