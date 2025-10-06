import { Sanitization, PseudonymizeStrategy } from '../types/types';

interface ReplacementKey {
  strategy: PseudonymizeStrategy;
  normalizedMatch: string;
  ruleId: string;
}

function normalizeMatch(value: string): string {
  return value.trim().toLowerCase();
}

function serializeKey(key: ReplacementKey): string {
  return `${key.ruleId}|${key.strategy}|${key.normalizedMatch}`;
}

function padNumber(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

function padHex(num: number, length: number): string {
  return num.toString(16).toUpperCase().padStart(length, '0');
}

export class Pseudonymizer {
  private replacements = new Map<string, string>();
  private counters = new Map<PseudonymizeStrategy, number>();

  reset(): void {
    this.replacements.clear();
    this.counters.clear();
  }

  getReplacement(rule: Sanitization, match: string): string {
    const strategy = rule.pseudonymizeStrategy;
    if (!strategy) {
      return rule.replacement;
    }

    const key = serializeKey({
      strategy,
      normalizedMatch: normalizeMatch(match),
      ruleId: rule.id || 'unknown'
    });

    const existing = this.replacements.get(key);
    if (existing) {
      return existing;
    }

    const replacement = this.generateReplacement(strategy);
    this.replacements.set(key, replacement);
    return replacement;
  }

  private generateReplacement(strategy: PseudonymizeStrategy): string {
    const count = (this.counters.get(strategy) ?? 0) + 1;
    this.counters.set(strategy, count as number);

    switch (strategy) {
      case 'name':
        return `Person ${count}`;
      case 'email':
        return `user${count}@example.com`;
      case 'ssn':
        return `000-00-${padNumber(count, 4)}`;
      case 'creditCard':
        return `4000-0000-0000-${padNumber(count, 4)}`;
      case 'phone':
        return `+1-555-010-${padNumber(count, 4)}`;
      case 'url':
        return `https://example${count}.com`;
      case 'mac': {
        const high = padHex(Math.floor((count - 1) / 256), 2);
        const low = padHex((count - 1) % 256, 2);
        return `AA:BB:00:00:${high}:${low}`;
      }
      case 'ipv4':
        return `10.0.${Math.floor((count - 1) / 254)}.${((count - 1) % 254) + 1}`;
      case 'ipv6':
        return `2001:db8::${count}`;
      case 'date':
        return `2000-01-${padNumber(((count - 1) % 28) + 1, 2)}`;
      case 'currency':
        return `$${padNumber(count, 3)}.${padNumber(count % 100, 2)}`;
      case 'generic':
      default:
        return `value-${count}`;
    }
  }
}

export const sharedPseudonymizer = new Pseudonymizer();
