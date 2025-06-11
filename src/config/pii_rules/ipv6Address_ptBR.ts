import { Sanitization } from '../../types/types';

export const ipv6Address_ptBR_Rule: Sanitization = {
  id: '11_ptBR',
  description: 'Endereços IPv6',
  pattern: '(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:)*:(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:)*::)(?!/)',
  replacement: 'XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX [IPv6]',
  enabled: true,
  isRegex: true,
};
