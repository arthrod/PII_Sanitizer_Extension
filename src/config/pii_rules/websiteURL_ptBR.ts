import { Sanitization } from '../../types/types';

export const websiteURL_ptBR_Rule: Sanitization = {
  id: '8_ptBR',
  description: 'URLs de Sites da Web',
  pattern: '\\b(?:(?:https?:|ftp:|sftp:)//)?(?:www\\.)?(?!(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b)[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+(?::[0-9]{1,5})?(?:/[^\\s]*)?\\b',
  replacement: 'https://dominio.com.br',
  enabled: true,
  isRegex: true,
};
