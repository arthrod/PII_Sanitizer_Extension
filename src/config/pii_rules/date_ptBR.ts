import { Sanitization } from '../../types/types';

export const date_ptBR_Rule: Sanitization = {
  id: '12_ptBR',
  description: 'Datas (Formatos Comuns, e.g., DD/MM/AAAA)',
  pattern: '\\b(?:(?:(?:0?[1-9]|1[0-2])[/.-](?:0?[1-9]|[12]\\d|3[01])[/.-](?:19|20)?\\d{2})|(?:(?:0?[1-9]|[12]\\d|3[01])[/.-](?:0?[1-9]|1[0-2])[/.-](?:19|20)?\\d{2})|(?:(?:19|20)?\\d{2}[/.-](?:0?[1-9]|1[0-2])[/.-](?:0?[1-9]|[12]\\d|3[01])))\\b',
  replacement: 'DD/MM/AAAA',
  enabled: true,
  isRegex: true,
};
