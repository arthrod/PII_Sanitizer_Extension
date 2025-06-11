import { Sanitization } from '../../types/types';

export const ipv4Address_ptBR_Rule: Sanitization = {
  id: '10_ptBR',
  description: 'Endereços IPv4',
  pattern: '\\b(?<!:)(?<!://)(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?![a-zA-Z])\\b',
  replacement: 'XXX.XXX.XXX.XXX [IPv4]',
  enabled: true,
  isRegex: true,
};
