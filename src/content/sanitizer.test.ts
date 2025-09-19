import { describe, expect, it } from 'vitest';
import { normalizeNewlines, sanitizeText } from './sanitizer';
import { DEFAULT_SANITIZATIONS } from '../shared/defaults';
import { Sanitization } from '../types/types';

const cloneSanitizations = () => DEFAULT_SANITIZATIONS.map((rule) => ({ ...rule }));

describe('sanitizeText', () => {
  it('redacts AWS access keys using default rules', () => {
    const sanitizations = cloneSanitizations();
    const sample = 'Credentials: AKIAIOSFODNN7EXAMPLE should never leak';
    const result = sanitizeText(sample, sanitizations);

    expect(result.text).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result.text).toContain('AWS_KEY_REMOVED');
    expect(result.replacementCount).toBeGreaterThanOrEqual(1);
  });

  it('redacts JWT tokens using default rules', () => {
    const sanitizations = cloneSanitizations();
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const sample = `Authorization: ${jwt}`;
    const result = sanitizeText(sample, sanitizations);

    expect(result.text).not.toContain(jwt);
    expect(result.matches.some((match) => match.replacement === '<JWT-REDACTED>')).toBe(true);
    expect(result.replacementCount).toBeGreaterThanOrEqual(1);
  });

  it('supports plain text sanitization rules', () => {
    const sanitizations: Sanitization[] = [
      {
        id: 'plain-text',
        description: 'Redact the word secret',
        pattern: 'secret',
        replacement: '[redacted]',
        enabled: true,
        isRegex: false
      }
    ];

    const result = sanitizeText('This is a secret message', sanitizations);

    expect(result.text).toBe('This is a [redacted] message');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].match).toBe('secret');
    expect(result.matches[0].replacement).toBe('[redacted]');
    expect(result.replacementCount).toBe(1);
  });

  it('normalizes newline variations before applying replacements', () => {
    const sanitizations: Sanitization[] = [
      {
        id: 'newline-secret',
        description: 'Redact the phrase token=abc',
        pattern: 'token=abc',
        replacement: 'token=<hidden>',
        enabled: true,
        isRegex: false
      }
    ];

    const sample = 'Line one\r\ntoken=abc\rLine three';
    const result = sanitizeText(sample, sanitizations);

    expect(normalizeNewlines(sample)).toBe('Line one\ntoken=abc\nLine three');
    expect(result.text).toBe('Line one\ntoken=<hidden>\nLine three');
    expect(result.replacementCount).toBe(1);
    expect(result.changed).toBe(true);
  });

  it('provides cursor guidance for typed and pasted input', () => {
    const sanitizations: Sanitization[] = [
      {
        id: 'cursor',
        description: 'Redact API tokens',
        pattern: 'api_token=secret',
        replacement: 'api_token=<redacted>',
        enabled: true,
        isRegex: false
      }
    ];

    const typed = sanitizeText('api_token=secret', sanitizations, {
      cursorPosition: 'api_token=secret'.length,
      isPaste: false
    });

    expect(typed.cursorPosition).toBe('api_token=<redacted>'.length);

    const pasted = sanitizeText('api_token=secret', sanitizations, {
      cursorPosition: 0,
      isPaste: true
    });

    expect(pasted.cursorPosition).toBe(pasted.text.length);
    expect(pasted.replacementCount).toBe(1);
  });
});
