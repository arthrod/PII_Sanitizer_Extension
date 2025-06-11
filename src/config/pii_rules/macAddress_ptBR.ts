import { Sanitization } from '../../types/types';

export const macAddress_ptBR_Rule: Sanitization = {
  id: '9_ptBR',
  description: 'Endereços MAC',
  pattern: '\\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\\b',
  replacement: 'XX:XX:XX:XX:XX:XX [MAC]',
  enabled: true,
  isRegex: true,
};
