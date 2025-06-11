import { Sanitization } from '../../types/types';

export const cnhRule: Sanitization = {
  id: 'br_cnh',
  description: 'Número de CNH (e.g., 01234567890)',
  pattern: '\\b\\d{11}\\b',
  replacement: '[CNH REMOVIDO]',
  enabled: true,
  isRegex: true,
};
