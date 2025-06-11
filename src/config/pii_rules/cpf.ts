import { Sanitization } from '../../types/types';

export const cpfRule: Sanitization = {
  id: 'br_cpf',
  description: 'Número de CPF (e.g., 123.456.789-00)',
  pattern: '\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b|\\b\\d{11}\\b',
  replacement: '[CPF REMOVIDO]',
  enabled: true,
  isRegex: true,
};
