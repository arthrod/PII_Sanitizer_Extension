import { Sanitization } from '../../types/types';

export const email_ptBR_Rule: Sanitization = {
  id: '2_ptBR',
  description: 'Endereços de Email',
  pattern: '\\b[A-Za-z0-9_%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
  replacement: 'email@dominio.com.br',
  enabled: true,
  isRegex: true,
};
