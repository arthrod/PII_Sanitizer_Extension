import { Sanitization } from '../../types/types';

export const ssn_USA_ptBR_Rule: Sanitization = {
  id: '3_ptBR',
  description: 'Números de Segurança Social (SSN dos EUA)',
  pattern: '\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b',
  replacement: 'XXX-XX-XXXX [SSN EUA]',
  enabled: false, // Disabled for pt-BR context
  isRegex: true,
};
