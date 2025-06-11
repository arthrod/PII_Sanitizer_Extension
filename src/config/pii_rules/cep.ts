import { Sanitization } from '../../types/types';

export const cepRule: Sanitization = {
  id: 'br_cep',
  description: 'CEP (e.g., 12345-678)',
  pattern: '\\b\\d{5}-\\d{3}\\b',
  replacement: '[CEP REMOVIDO]',
  enabled: true,
  isRegex: true,
};
