import { describe, expect, it } from 'vitest';

import { AuthError, formatErrorForUser } from '../../src/core/errors';

describe('formatErrorForUser', () => {
  it('includes code and hint', () => {
    const message = formatErrorForUser(new AuthError('Missing API key.', 'Run login first.'));

    expect(message).toContain('[AUTH_ERROR]');
    expect(message).toContain('Missing API key.');
    expect(message).toContain('Hint: Run login first.');
  });
});
