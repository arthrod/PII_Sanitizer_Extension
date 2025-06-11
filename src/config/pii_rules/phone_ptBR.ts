import { Sanitization } from '../../types/types';

export const phone_ptBR_Rule: Sanitization = {
  id: '7_ptBR',
  description: 'Números de Telefone (Formatos Brasileiros Comuns)',
  pattern: '\\b(?:\\+?55\\s?)?(?:\\(?0?[1-9][0-9]\\)?\\s?)?(?:9\\d{4}|\\d{4})[-.\\s]?\\d{4}\\b',
  replacement: '(XX) XXXXX-XXXX',
  enabled: true,
  isRegex: true,
};
