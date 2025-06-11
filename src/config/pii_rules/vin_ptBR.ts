import { Sanitization } from '../../types/types';

export const vin_ptBR_Rule: Sanitization = {
  id: '13_ptBR',
  description: 'Números VIN (Chassi de Veículo)',
  pattern: '\\b(?:VIN|Vehicle|ID)\\s*[:#]?\\s*[A-HJ-NPR-Z0-9]{17}\\b',
  replacement: 'VIN_REMOVIDO',
  enabled: true,
  isRegex: true,
};
