import { describe, expect, it, vi } from 'vitest';

import {
  deriveUserEmail,
  PIXTRELA_EMAIL_DOMAIN,
  prepareUserWriteBody,
} from './user-create-body';

describe('deriveUserEmail', () => {
  it('builds email from username', () => {
    expect(deriveUserEmail('Maria.9876')).toBe(
      `maria.9876@${PIXTRELA_EMAIL_DOMAIN}`,
    );
  });
});

describe('prepareUserWriteBody', () => {
  it('always syncs email when username is present', async () => {
    vi.stubGlobal('strapi', {
      db: {
        query: () => ({
          findOne: vi.fn().mockResolvedValue(null),
        }),
      },
    });

    const body = await prepareUserWriteBody({
      username: 'joao.silva.2',
      email: 'joao.2@pixtrela.local',
    });

    expect(body.email).toBe('joao.silva.2@pixtrela.local');
    vi.unstubAllGlobals();
  });
});
