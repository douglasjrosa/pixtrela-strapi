const MIN_PASSWORD_LENGTH = 6;

export type ColaboratorUserRecord = {
  id: number;
  username: string;
  documentId?: string;
  document_id?: string;
  roleType?: string;
  role_type?: string;
  password?: string;
  blocked?: boolean;
  provider?: string | null;
};

export type KioskIdentifyInput = {
  code: number;
  password: string;
};

type ParseResult =
  | { ok: true; value: KioskIdentifyInput }
  | { ok: false; error: string };

function unwrapRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    return record.data;
  }
  return body;
}

function parseCode(value: unknown): number | null {
  const code = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(code) || code < 0) return null;
  return code;
}

export function readColaboratorRoleType(
  user: ColaboratorUserRecord | null | undefined,
): string | null {
  if (!user) return null;
  const value = user.roleType ?? user.role_type;
  return typeof value === 'string' ? value : null;
}

export function mapUserRowFromDb(
  row: Record<string, unknown> | undefined,
): ColaboratorUserRecord | null {
  if (!row || row.id == null) return null;

  const mapped: ColaboratorUserRecord = {
    id: Number(row.id),
    username: String(row.username ?? ''),
    documentId:
      typeof row.documentId === 'string' ? row.documentId : undefined,
    document_id:
      typeof row.document_id === 'string' ? row.document_id : undefined,
    roleType: typeof row.roleType === 'string' ? row.roleType : undefined,
    role_type: typeof row.role_type === 'string' ? row.role_type : undefined,
    password: typeof row.password === 'string' ? row.password : undefined,
    blocked: row.blocked === true || row.blocked === 1,
    provider: typeof row.provider === 'string' ? row.provider : null,
  };

  if (!mapped.roleType && mapped.role_type) {
    mapped.roleType = mapped.role_type;
  }

  return mapped;
}

export function parseKioskIdentifyBody(body: unknown): ParseResult {
  const payload = unwrapRequestBody(body);
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid body' };
  }

  const { code, password } = payload as Record<string, unknown>;
  const parsedCode = parseCode(code);
  if (parsedCode === null) {
    return { ok: false, error: 'Invalid code' };
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: 'Invalid password' };
  }

  return { ok: true, value: { code: parsedCode, password } };
}

export function canIdentifyColaborator(
  user: ColaboratorUserRecord | null | undefined,
): user is ColaboratorUserRecord {
  if (!user) return false;
  if (user.blocked) return false;
  if (readColaboratorRoleType(user) !== 'colaborator') return false;
  if (!user.password) return false;
  return true;
}
