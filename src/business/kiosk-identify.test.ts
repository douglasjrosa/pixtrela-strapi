import { describe, expect, it } from 'vitest';

import {
  canIdentifyColaborator,
  mapUserRowFromDb,
  parseKioskIdentifyBody,
  type ColaboratorUserRecord,
} from './kiosk-identify';

const COLABORATOR: ColaboratorUserRecord = {
  id: 7,
  username: 'maria.1234',
  roleType: 'colaborator',
  password: 'hashed',
  blocked: false,
};

describe('parseKioskIdentifyBody', () => {
  it('accepts valid code and password', () => {
    expect(parseKioskIdentifyBody({ code: 1234, password: 'secret1' })).toEqual({
      ok: true,
      value: { code: 1234, password: 'secret1' },
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseKioskIdentifyBody(null).ok).toBe(false);
    expect(parseKioskIdentifyBody({ code: -1, password: 'secret1' }).ok).toBe(false);
    expect(parseKioskIdentifyBody({ code: 1, password: '123' }).ok).toBe(false);
  });

  it('coerces string code and unwraps data wrapper', () => {
    expect(
      parseKioskIdentifyBody({
        data: { code: '1234', password: 'secret1' },
      }),
    ).toEqual({
      ok: true,
      value: { code: 1234, password: 'secret1' },
    });
  });
});

describe('mapUserRowFromDb', () => {
  it('maps snake_case db columns', () => {
    expect(
      mapUserRowFromDb({
        id: 7,
        username: 'maria.1234',
        document_id: 'doc-7',
        role_type: 'colaborator',
        password: 'hashed',
        blocked: 0,
        provider: 'local',
      }),
    ).toMatchObject({
      id: 7,
      document_id: 'doc-7',
      roleType: 'colaborator',
      password: 'hashed',
      blocked: false,
    });
  });
});

describe('canIdentifyColaborator', () => {
  it('allows active colaborators with password', () => {
    expect(canIdentifyColaborator(COLABORATOR)).toBe(true);
  });

  it('rejects missing, blocked or non-colaborator users', () => {
    expect(canIdentifyColaborator(null)).toBe(false);
    expect(canIdentifyColaborator({ ...COLABORATOR, blocked: true })).toBe(false);
    expect(canIdentifyColaborator({ ...COLABORATOR, roleType: 'leader' })).toBe(false);
    expect(canIdentifyColaborator({ ...COLABORATOR, password: undefined })).toBe(false);
  });

  it('accepts role_type from db rows', () => {
    expect(
      canIdentifyColaborator({
        ...COLABORATOR,
        roleType: undefined,
        role_type: 'colaborator',
      }),
    ).toBe(true);
  });
});
