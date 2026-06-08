import { describe, expect, it } from 'vitest';

import { deriveUserEmail, PIXTRELA_EMAIL_DOMAIN } from './user-create-body';

describe('deriveUserEmail', () => {
  it('builds email from username', () => {
    expect(deriveUserEmail('Maria.9876')).toBe(
      `maria.9876@${PIXTRELA_EMAIL_DOMAIN}`,
    );
  });
});
