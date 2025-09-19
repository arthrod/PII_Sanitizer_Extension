import { Sanitization } from '../types/types';

export interface SanitizationMatch {
  id: string;
  match: string;
  replacement: string;
  index: number;
  length: number;
}

export interface SanitizeOptions {
  cursorPosition?: number | null;
  isPaste?: boolean;
}

export interface SanitizeResult {
  text: string;
  cursorPosition: number | null;
  matches: SanitizationMatch[];
  replacementCount: number;
  changed: boolean;
}

export function normalizeNewlines(text: string): string {
  if (!text) {
    return '';
  }

  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function createRuleRegex(rule: Sanitization): RegExp {
  if (rule.isRegex) {
    return new RegExp(rule.pattern, 'g');
  }

  const escapedPattern = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escapedPattern, 'g');
}

export function sanitizeText(
  text: string,
  sanitizations: Sanitization[],
  options: SanitizeOptions = {}
): SanitizeResult {
  const cursorPosition = options.cursorPosition ?? null;
  const isPaste = options.isPaste ?? false;

  if (!text) {
    return {
      text: '',
      cursorPosition,
      matches: [],
      replacementCount: 0,
      changed: false
    };
  }

  const normalizedText = normalizeNewlines(text);
  const lines = normalizedText.split(/(\n)/);

  const sanitizedLines: string[] = [];
  const matches: SanitizationMatch[] = [];

  let lastReplacementEnd = -1;
  let currentPosition = 0;

  for (const line of lines) {
    if (line === '\n') {
      sanitizedLines.push(line);
      currentPosition += line.length;
      continue;
    }

    let processedLine = line;

    for (const rule of sanitizations) {
      if (!rule.enabled) {
        continue;
      }

      const detectionRegex = createRuleRegex(rule);
      const originalLine = processedLine;

      let match: RegExpExecArray | null;
      while ((match = detectionRegex.exec(originalLine)) !== null) {
        const matchedText = match[0];
        const globalMatchIndex = currentPosition + match.index;

        matches.push({
          id: rule.id,
          match: matchedText,
          replacement: rule.replacement,
          index: globalMatchIndex,
          length: matchedText.length
        });

        if (cursorPosition !== null && !isPaste && globalMatchIndex <= cursorPosition) {
          lastReplacementEnd = globalMatchIndex + rule.replacement.length;
        }

        if (match.index === detectionRegex.lastIndex) {
          detectionRegex.lastIndex++;
        }
      }

      const replacementRegex = createRuleRegex(rule);
      processedLine = processedLine.replace(replacementRegex, rule.replacement);
    }

    sanitizedLines.push(processedLine);
    currentPosition += line.length;
  }

  const sanitizedText = sanitizedLines.join('');
  let newCursorPosition = cursorPosition;

  if (cursorPosition !== null) {
    if (isPaste) {
      newCursorPosition = sanitizedText.length;
    } else if (lastReplacementEnd >= 0) {
      newCursorPosition = lastReplacementEnd;
    } else if (cursorPosition === text.length) {
      newCursorPosition = sanitizedText.length;
    } else {
      newCursorPosition = Math.min(cursorPosition, sanitizedText.length);
    }
  }

  const replacementCount = matches.length;

  return {
    text: sanitizedText,
    cursorPosition: newCursorPosition ?? null,
    matches,
    replacementCount,
    changed: replacementCount > 0 || sanitizedText !== text
  };
}

export function countMatches(text: string, sanitizations: Sanitization[]): number {
  if (!text) {
    return 0;
  }

  return sanitizeText(text, sanitizations, { cursorPosition: null }).replacementCount;
}
