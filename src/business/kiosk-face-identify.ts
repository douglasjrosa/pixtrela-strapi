import {
  normalizeFaceVector,
  type FaceIdentifyStatus,
} from './face-vector';

export type FaceIdentifyCandidate = {
  documentId: string;
  name: string;
  greetingGender: 'masculine' | 'feminine' | null;
  avatarUrl: string | null;
  facePhotoUrl: string | null;
  faceVector?: number[];
};

export type FaceIdentifyResponse =
  | { status: 'match'; match: FaceIdentifyCandidate }
  | { status: 'ambiguous'; candidates: FaceIdentifyCandidate[] }
  | { status: 'none' };

type ParseResult =
  | { ok: true; descriptor: number[] }
  | { ok: false; error: string };

function unwrapRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    return record.data;
  }
  return body;
}

export function parseKioskFaceIdentifyBody(body: unknown): ParseResult {
  const payload = unwrapRequestBody(body);
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid body' };
  }

  const descriptor = normalizeFaceVector(
    (payload as { descriptor?: unknown }).descriptor,
  );
  if (!descriptor) {
    return { ok: false, error: 'Invalid descriptor' };
  }

  return { ok: true, descriptor };
}

function readGreetingGender(
  value: unknown,
): FaceIdentifyCandidate['greetingGender'] {
  if (value === 'feminine') return 'feminine';
  if (value === 'masculine') return 'masculine';
  return null;
}

export function mapFaceIdentifyCandidate(
  user: {
    documentId?: string;
    document_id?: string;
    name?: string;
    username?: string;
    greetingGender?: string | null;
    greeting_gender?: string | null;
    faceVector?: unknown;
    avatar?: { url?: string } | null;
    facePhoto?: { url?: string } | null;
  },
  options: { includeFaceVector: boolean },
): FaceIdentifyCandidate {
  const candidate: FaceIdentifyCandidate = {
    documentId: String(user.documentId ?? user.document_id ?? ''),
    name: String(user.name ?? user.username ?? ''),
    greetingGender: readGreetingGender(
      user.greetingGender ?? user.greeting_gender,
    ),
    avatarUrl: user.avatar?.url ? String(user.avatar.url) : null,
    facePhotoUrl: user.facePhoto?.url ? String(user.facePhoto.url) : null,
  };

  if (options.includeFaceVector) {
    const vector = normalizeFaceVector(user.faceVector);
    if (vector) candidate.faceVector = vector;
  }

  return candidate;
}

export function buildFaceIdentifyResponse(
  status: FaceIdentifyStatus,
  rankedDocumentIds: string[],
  byDocumentId: Map<string, FaceIdentifyCandidate>,
): FaceIdentifyResponse {
  if (status === 'none' || rankedDocumentIds.length === 0) {
    return { status: 'none' };
  }

  if (status === 'match') {
    const match = byDocumentId.get(rankedDocumentIds[0]!);
    if (!match) return { status: 'none' };
    return { status: 'match', match };
  }

  const candidates = rankedDocumentIds
    .map((documentId) => byDocumentId.get(documentId))
    .filter((row): row is FaceIdentifyCandidate => Boolean(row));

  if (candidates.length < 2) {
    if (candidates[0]) {
      return { status: 'match', match: candidates[0] };
    }
    return { status: 'none' };
  }

  return { status: 'ambiguous', candidates };
}
