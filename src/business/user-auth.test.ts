import { describe, expect, it } from 'vitest';

import { ensureLocalProvider, LOCAL_AUTH_PROVIDER } from './user-auth';

describe('ensureLocalProvider', () => {
  it('sets provider to local when missing', () => {
    const data = { username: 'maria.9876' };
    ensureLocalProvider(data);
    expect(data.provider).toBe(LOCAL_AUTH_PROVIDER);
  });

  it('keeps an existing provider', () => {
    const data = { provider: 'google' };
    ensureLocalProvider(data);
    expect(data.provider).toBe('google');
  });
});
