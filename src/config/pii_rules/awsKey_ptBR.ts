import { Sanitization } from '../../types/types';

export const awsKey_ptBR_Rule: Sanitization = {
  id: '6_ptBR',
  description: 'Chaves de Acesso AWS',
  pattern: '\\b(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}\\b',
  replacement: 'CHAVE_AWS_REMOVIDA',
  enabled: true,
  isRegex: true,
};
