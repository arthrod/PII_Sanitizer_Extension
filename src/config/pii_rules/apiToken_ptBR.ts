import { Sanitization } from '../../types/types';

export const apiToken_ptBR_Rule: Sanitization = {
  id: '5_ptBR',
  description: 'Tokens Comuns de API/Autenticação',
  pattern: '\\b(?:bearer|api_key|auth_token)\\b\\s+([A-Za-z0-9._+\\-\\/]{20,})\\b',
  replacement: 'TOKEN_API_REMOVIDO',
  enabled: true,
  isRegex: true,
};
