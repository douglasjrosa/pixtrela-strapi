import { describe, expect, it } from 'vitest';

import {
  assertKioskJwt,
  resolveColaboratorUserId,
  resolveJwtUserId,
} from './kiosk-jwt';

describe('resolveJwtUserId', () => {
  it('returns user id from a valid bearer token', async () => {
    const id = await resolveJwtUserId('Bearer token-1', async () => ({ id: 6 }));
    expect(id).toBe(6);
  });

  it('returns null for missing or invalid authorization', async () => {
    await expect(resolveJwtUserId(undefined, async () => ({ id: 6 }))).resolves.toBeNull();
    await expect(
      resolveJwtUserId('Bearer bad', async () => {
        throw new Error('invalid');
      }),
    ).resolves.toBeNull();
  });
});

describe('assertKioskJwt', () => {
  it('allows kiosk role users', async () => {
    const knex = () => ({
      where: () => ({
        select: async () => [{ role_type: 'kiosk' }],
      }),
    });

    await expect(assertKioskJwt(knex as never, 1)).resolves.toBeUndefined();
  });

  it('rejects non-kiosk users', async () => {
    const knex = () => ({
      where: () => ({
        select: async () => [{ role_type: 'colaborator' }],
      }),
    });

    await expect(assertKioskJwt(knex as never, 1)).rejects.toThrow('forbidden');
  });
});

describe('resolveColaboratorUserId', () => {
  it('returns numeric id for active colaborators', async () => {
    const knex = () => ({
      where: () => ({
        select: async () => [
          { id: 9, role_type: 'colaborator', blocked: false },
        ],
      }),
    });

    await expect(
      resolveColaboratorUserId(knex as never, 'col-doc'),
    ).resolves.toBe(9);
  });

  it('rejects missing colaborators', async () => {
    const knex = () => ({
      where: () => ({
        select: async () => [],
      }),
    });

    await expect(
      resolveColaboratorUserId(knex as never, 'missing'),
    ).rejects.toThrow('notFound');
  });
});
