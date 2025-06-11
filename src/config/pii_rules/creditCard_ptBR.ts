import { Sanitization } from '../../types/types';

export const creditCard_ptBR_Rule: Sanitization = {
  id: '4_ptBR',
  description: 'Números de Cartão de Crédito (Principais Bandeiras)',
  pattern: '\\b(?:3(?:0[0-5]|09|[68][0-9])[0-9]{11,14}|4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11}|62[0-9]{14,17})\\b',
  replacement: '************1234 [Cartão]',
  enabled: true,
  isRegex: true,
};
