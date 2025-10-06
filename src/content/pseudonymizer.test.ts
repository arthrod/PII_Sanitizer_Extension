import { describe, expect, it } from 'vitest';
import { Pseudonymizer } from './pseudonymizer';
import { Sanitization } from '../types/types';

const createRule = (overrides: Partial<Sanitization>): Sanitization => ({
  id: 'test',
  description: 'test',
  pattern: 'test',
  replacement: '<redacted>',
  enabled: true,
  isRegex: true,
  ...overrides
});

describe('Pseudonymizer', () => {
  it('reuses the same alias for identical matches', () => {
    const pseudonymizer = new Pseudonymizer();
    const rule = createRule({ id: 'name', pseudonymizeStrategy: 'name' });

    const first = pseudonymizer.getReplacement(rule, 'Alice Smith');
    const second = pseudonymizer.getReplacement(rule, 'Alice Smith');

    expect(first).toBe(second);
    expect(first).toMatch(/^Person \d+$/);
  });

  it('produces different aliases for different inputs', () => {
    const pseudonymizer = new Pseudonymizer();
    const rule = createRule({ id: 'email', pseudonymizeStrategy: 'email' });

    const first = pseudonymizer.getReplacement(rule, 'alice@example.com');
    const second = pseudonymizer.getReplacement(rule, 'bob@example.com');

    expect(first).not.toBe(second);
    expect(first).toMatch(/^user\d+@example\.com$/);
    expect(second).toMatch(/^user\d+@example\.com$/);
  });

  it('keeps counters separated per strategy', () => {
    const pseudonymizer = new Pseudonymizer();

    const nameRule = createRule({ id: 'name', pseudonymizeStrategy: 'name' });
    const emailRule = createRule({ id: 'email', pseudonymizeStrategy: 'email' });

    const nameReplacement = pseudonymizer.getReplacement(nameRule, 'Alice Smith');
    const emailReplacement = pseudonymizer.getReplacement(emailRule, 'alice@example.com');

    expect(nameReplacement).toMatch(/^Person \d+$/);
    expect(emailReplacement).toMatch(/^user\d+@example\.com$/);
  });
});
