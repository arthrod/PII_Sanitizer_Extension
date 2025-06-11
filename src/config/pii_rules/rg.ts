import { Sanitization } from '../../types/types';

export const rgRule: Sanitization = {
  id: 'br_rg',
  description: 'Número de RG (e.g., 12.345.678-9)',
  pattern: '\\b\\d{1,2}\\.?\\d{3}\\.?\\d{3}-?[A-Za-z0-9]{1}\\b',
  replacement: '[RG REMOVIDO]',
  enabled: true,
  isRegex: true,
};
