import {
  FACE_MATCH_DISTANCE_THRESHOLD,
  normalizeFaceVector,
} from './face-vector';

export type AuthLoginUserPayload = {
  id: number;
  documentId: string;
  username: string;
  email: string | null;
  name: string;
  roleType: string;
};

export type AuthLoginSuccessBody = {
  jwt: string;
  user: AuthLoginUserPayload;
};

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function unwrapRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    return record.data;
  }
  return body;
}

export function buildAuthLoginUserPayload(user: {
  id: number;
  documentId?: string;
  document_id?: string;
  username?: string;
  email?: string | null;
  name?: string | null;
  roleType?: string;
  role_type?: string;
}): AuthLoginUserPayload {
  const documentId = user.documentId ?? user.document_id ?? String(user.id);
  const roleType = user.roleType ?? user.role_type ?? 'colaborator';
  return {
    id: user.id,
    documentId,
    username: String(user.username ?? ''),
    email: typeof user.email === 'string' ? user.email : null,
    name: String(user.name ?? user.username ?? ''),
    roleType,
  };
}

export function isFaceMatchDistance(distance: number): boolean {
  return distance < FACE_MATCH_DISTANCE_THRESHOLD;
}

export function parseLoginByFaceConfirmBody(
  body: unknown,
): ParseResult<{ descriptor: number[]; documentId: string }> {
  const payload = unwrapRequestBody(body);
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid body' };
  }

  const record = payload as Record<string, unknown>;
  const documentId =
    typeof record.documentId === 'string' ? record.documentId.trim() : '';
  if (!documentId) {
    return { ok: false, error: 'Invalid documentId' };
  }

  const descriptor = normalizeFaceVector(record.descriptor);
  if (!descriptor) {
    return { ok: false, error: 'Invalid descriptor' };
  }

  return { ok: true, value: { descriptor, documentId } };
}

/**
 * Human roles that may establish an app session via identify methods.
 * Excludes the device `kiosk` role (uses classic username login).
 */
export function canEstablishAppSession(
  roleType: string | null | undefined,
  blocked: boolean | undefined,
): boolean {
  if (blocked) return false;
  if (!roleType) return false;
  return (
    roleType === 'colaborator' ||
    roleType === 'admin' ||
    roleType === 'manager' ||
    roleType === 'leader'
  );
}
