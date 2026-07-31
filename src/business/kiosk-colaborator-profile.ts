export type KioskColaboratorProfile = {
  documentId: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * Maps a Strapi user document into the kiosk panel header profile.
 */
export function mapKioskColaboratorProfile(user: {
  documentId?: string;
  document_id?: string;
  name?: string;
  username?: string;
  avatar?: { url?: string } | null;
}): KioskColaboratorProfile | null {
  const documentId = String(user.documentId ?? user.document_id ?? "").trim();
  const name = String(user.name ?? user.username ?? "").trim();
  if (!documentId || !name) return null;

  return {
    documentId,
    name,
    avatarUrl: user.avatar?.url ? String(user.avatar.url) : null,
  };
}
