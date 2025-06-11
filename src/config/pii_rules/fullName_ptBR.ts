import { Sanitization } from '../../types/types';

export const fullName_ptBR_Rule: Sanitization = {
  id: '1_ptBR', // Keep original ID base for potential upgrade paths, add suffix
  description: 'Nomes Completos (e.g., João Silva)',
  pattern: '\\b[A-Z][a-z]+\\s[A-Z][a-z]+\\b',
  replacement: 'Nome Completo',
  enabled: false, // As per original and adaptation plan
  isRegex: true,
};
