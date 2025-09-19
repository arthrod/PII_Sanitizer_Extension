import { sanitizeText, SanitizeResult } from './sanitizer';
import { Sanitization, Website } from '../types/types';

let sanitizations: Sanitization[] = [];
let websites: Website[] = [];
let isGloballyPaused = false;
let isInitialized = false;
let isProgrammaticUpdate = false;
let lastActiveElement: HTMLElement | null = null;

const scrubButtons = new WeakMap<HTMLElement, HTMLButtonElement>();
const highlightTimers = new WeakMap<HTMLElement, number>();

function formatScrubButtonLabel(matchCount: number): string {
  if (matchCount <= 0) {
    return 'Scrub sensitive data';
  }

  return `Scrub ${matchCount} sensitive item${matchCount === 1 ? '' : 's'}`;
}

function updateScrubButtonLabel(target: HTMLElement, matchCount: number): void {
  const button = scrubButtons.get(target);
  if (!button) {
    return;
  }

  const label = formatScrubButtonLabel(matchCount);
  if (button.textContent !== label) {
    button.textContent = label;
  }

  if (matchCount > 0) {
    button.dataset.matchCount = String(matchCount);
  } else {
    delete button.dataset.matchCount;
  }
}

// Load settings from storage
function loadSettings() {
  console.log('Loading settings...');
  chrome.storage.local.get(['sanitizations', 'websites', 'isGloballyPaused'], (result) => {
    sanitizations = result.sanitizations || [];
    websites = result.websites || [];
    isGloballyPaused = result.isGloballyPaused || false;
    console.log('Settings loaded:', { sanitizations, websites, isGloballyPaused });
    
    if (shouldMonitorThisPage() && !isInitialized) {
      console.log('Initializing monitoring...');
      isInitialized = true;
      initializeMonitoring();
    }
  });
}

// Initial load
loadSettings();

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  console.log('Storage changes:', changes);
  
  if (changes.sanitizations) {
    sanitizations = changes.sanitizations.newValue;
  }
  if (changes.websites) {
    websites = changes.websites.newValue;
    if (shouldMonitorThisPage() && !isInitialized) {
      isInitialized = true;
      initializeMonitoring();
    }
  }
  if (changes.isGloballyPaused) {
    isGloballyPaused = changes.isGloballyPaused.newValue;
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'perform-manual-scrub' && lastActiveElement) {
    sanitizeElement(lastActiveElement, { manual: true });
  }
});

function shouldMonitorThisPage(): boolean {
  const currentHostname = window.location.hostname;
  return websites.some(site => site.enabled && currentHostname.includes(site.url));
}

function isHiddenTextarea(element: HTMLElement): boolean {
  return element instanceof HTMLTextAreaElement && 
         element.style.display === 'none' &&
         element.getAttribute('data-virtualkeyboard') === 'true';
}

function isChatGPTTextarea(element: HTMLElement): boolean {
  return element.id === 'prompt-textarea' && 
         element.classList.contains('ProseMirror');
}

function isClaudeTextarea(element: HTMLElement): boolean {
  return element.matches('textarea[placeholder*="Message Claude"]') ||
         (element.isContentEditable && element.classList.contains('ProseMirror') && 
          window.location.hostname.includes('claude.ai'));
}

function formatForChatGPT(text: string): string {
  const lines = text.split('\n');
  return lines.map(line => 
    `<p>${line || '<br class="ProseMirror-trailingBreak">'}</p>`
  ).join('');
}

function formatForClaude(text: string): string {
  // Normalize all newlines
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into lines and wrap each line in <p> tags
  const formattedText = normalizedText
    .split('\n')
    .map(line => `<p>${line}</p>`)
    .join('');

  return formattedText;
}

function getTextFromContentEditable(element: HTMLElement, isProseMirror: boolean): string {
  if (isProseMirror) {
    // For ProseMirror (both GPT and Claude), extract text from <p> tags
    const paragraphs = element.getElementsByTagName('p');
    return Array.from(paragraphs)
      .map(p => p.textContent?.replace(/\u200B/g, '') || '')
      .join('\n');
  } else {
    // For standard contenteditable
    return element.textContent || '';
  }
}

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'pii-toast-notification';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('pii-toast-visible');
  });

  window.setTimeout(() => {
    toast.classList.remove('pii-toast-visible');
    window.setTimeout(() => toast.remove(), 300);
  }, 2400);
}

function updateSensitiveIndicator(target: HTMLElement, matchCount: number) {
  updateScrubButtonLabel(target, matchCount);

  if (matchCount > 0) {
    target.dataset.piiMatchCount = String(matchCount);
    target.classList.add('pii-just-sanitized');

    const existingTimer = highlightTimers.get(target);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timeoutId = window.setTimeout(() => {
      target.classList.remove('pii-just-sanitized');
      highlightTimers.delete(target);
    }, 2000);

    highlightTimers.set(target, timeoutId);
  } else {
    target.classList.remove('pii-just-sanitized');
    const timer = highlightTimers.get(target);
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
    highlightTimers.delete(target);
    delete target.dataset.piiMatchCount;
  }
}

function ensureScrubButton(target: HTMLElement) {
  if (scrubButtons.has(target)) {
    return;
  }

  if (!target.parentElement) {
    return;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = formatScrubButtonLabel(0);
  button.className = 'pii-scrub-button';
  button.setAttribute('aria-live', 'polite');
  button.addEventListener('click', () => {
    sanitizeElement(target, { manual: true });
  });

  target.insertAdjacentElement('afterend', button);
  scrubButtons.set(target, button);
}

function removeScrubButton(target: HTMLElement) {
  const button = scrubButtons.get(target);
  if (!button) {
    return;
  }

  button.remove();
  scrubButtons.delete(target);
}

function sanitizeElement(
  target: HTMLElement,
  options: { isPaste?: boolean; manual?: boolean } = {}
): SanitizeResult {
  const { isPaste = false, manual = false } = options;

  let text: string | null = null;
  let cursorPosition: number | null = null;
  const isGPT = isChatGPTTextarea(target);
  const isClaude = isClaudeTextarea(target);

  if (!target.isConnected) {
    removeScrubButton(target);
    highlightTimers.delete(target);
    return {
      text: '',
      cursorPosition: null,
      matches: [],
      replacementCount: 0,
      changed: false
    };
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    text = target.value;
    cursorPosition = target.selectionStart;
  } else if (target instanceof HTMLElement && target.isContentEditable) {
    text = getTextFromContentEditable(target, isGPT || isClaude);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorPosition = range.startOffset;
    }
  }

  if (text === null) {
    return {
      text: '',
      cursorPosition: null,
      matches: [],
      replacementCount: 0,
      changed: false
    };
  }

  lastActiveElement = target;

  if (isGloballyPaused) {
    if (text.trim()) {
      ensureScrubButton(target);
      updateScrubButtonLabel(target, 0);
    } else {
      removeScrubButton(target);
    }

    return {
      text,
      cursorPosition,
      matches: [],
      replacementCount: 0,
      changed: false
    };
  }

  if (text.trim()) {
    ensureScrubButton(target);
  } else {
    removeScrubButton(target);
  }

  const result = sanitizeText(text, sanitizations, {
    cursorPosition,
    isPaste
  });

  updateSensitiveIndicator(target, result.replacementCount);

  if (result.text !== text) {
    isProgrammaticUpdate = true;
    try {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.value = result.text;
        if (result.cursorPosition !== null) {
          target.setSelectionRange(result.cursorPosition, result.cursorPosition);
        }
      } else if (target instanceof HTMLElement && target.isContentEditable) {
        if (isGPT) {
          target.innerHTML = formatForChatGPT(result.text);
        } else if (isClaude) {
          target.innerHTML = formatForClaude(result.text);
        } else {
          target.textContent = result.text;
        }

        if (result.cursorPosition !== null && window.getSelection) {
          const selection = window.getSelection();
          if (selection) {
            try {
              const range = document.createRange();
              if (isGPT || isClaude) {
                const lastChild = target.lastElementChild || target;
                range.selectNodeContents(lastChild);
                range.collapse(false);
              } else if (target.firstChild) {
                const safePosition = Math.min(result.cursorPosition, result.text.length);
                range.setStart(target.firstChild, safePosition);
                range.setEnd(target.firstChild, safePosition);
              }
              selection.removeAllRanges();
              selection.addRange(range);
            } catch (e) {
              console.error('Error setting cursor position:', e);
              const range = document.createRange();
              range.selectNodeContents(target);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    } finally {
      isProgrammaticUpdate = false;
      delete target.dataset.justPasted;
    }
  } else if (!isPaste) {
    delete target.dataset.justPasted;
  }

  if (manual) {
    if (result.replacementCount > 0) {
      showToast(`${result.replacementCount} sensitive item${result.replacementCount > 1 ? 's' : ''} masked`);
    } else {
      showToast('No sensitive items detected');
    }
  }

  return result;
}

function handleInput(event: Event) {
  if (isGloballyPaused || isProgrammaticUpdate) {
    return;
  }

  const target = event.target as HTMLElement;

  if (isHiddenTextarea(target)) {
    return;
  }

  sanitizeElement(target, { isPaste: target.dataset.justPasted === 'true' });
}

function handlePaste(event: ClipboardEvent) {
  if (isGloballyPaused || isProgrammaticUpdate) {
    return;
  }

  const target = event.target as HTMLElement;

  if (isHiddenTextarea(target)) {
    return;
  }

  target.dataset.justPasted = 'true';
  lastActiveElement = target;

  const isGPT = isChatGPTTextarea(target);
  const isClaude = isClaudeTextarea(target);

  if (isGPT || isClaude) {
    setTimeout(() => {
      sanitizeElement(target, { isPaste: true });
    }, 0);
  } else {
    sanitizeElement(target, { isPaste: true });
  }
}

function shouldMonitorElement(element: HTMLElement): boolean {
  if (isHiddenTextarea(element)) {
    return false;
  }

  const chatGPTSelectors = [
    'div[contenteditable="true"]#prompt-textarea',
    'textarea.text-input:not([style*="display: none"])'
  ];
  
  const claudeSelectors = [
    'textarea[placeholder*="Message Claude"]',
    'div[contenteditable="true"]'
  ];
  
  const bardSelectors = [
    'textarea[placeholder*="Enter a prompt"]',
    'div[contenteditable="true"][aria-label*="Prompt"]'
  ];

  const allSelectors = [...chatGPTSelectors, ...claudeSelectors, ...bardSelectors];
  
  return allSelectors.some(selector => element.matches(selector)) ||
         element.matches('input[type="text"], textarea:not([style*="display: none"])');
}

function setupInput(input: HTMLElement) {
  if (!input.classList.contains('pii-monitored') && shouldMonitorElement(input)) {
    console.log('Setting up input:', input);
    
    input.classList.add('pii-monitored');
    
    input.removeEventListener('input', handleInput);
    input.removeEventListener('paste', handlePaste);
    
    input.addEventListener('input', handleInput);
    input.addEventListener('paste', handlePaste);
  }
}

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function initializeMonitoring() {
  const style = document.createElement('style');
  style.textContent = `
    .pii-monitored {
      border: 2px solid #22c55e !important;
      transition: border-color 0.3s ease;
      border-radius: 5px;
    }
    .pii-monitored:focus {
      border-color: #16a34a !important;
      border-radius: 5px;
    }
    .pii-just-sanitized {
      box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.45) !important;
    }
    .pii-scrub-button {
      margin-top: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid #e5e7eb;
      background: #111827;
      color: #f9fafb;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
    }
    .pii-scrub-button:hover {
      background: #1f2937;
    }
    .pii-scrub-button[data-match-count] {
      background: #dc2626;
      border-color: #b91c1c;
    }
    .pii-scrub-button[data-match-count]:hover {
      background: #b91c1c;
    }
    .pii-toast-notification {
      position: fixed;
      bottom: 120px;
      right: 24px;
      padding: 8px 12px;
      background: rgba(17, 24, 39, 0.95);
      color: #f9fafb;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.4;
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .pii-toast-visible {
      opacity: 0.95;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  const debouncedSetup = debounce(() => {
    document.querySelectorAll('input[type="text"], textarea, div[contenteditable="true"]').forEach(input => {
      if (input instanceof HTMLElement) {
        setupInput(input);
      }
    });
  }, 100);

  debouncedSetup();

  const observer = new MutationObserver((mutations) => {
    let shouldSetup = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldSetup = true;
      } else if (mutation.type === 'attributes' && 
                 mutation.target instanceof HTMLElement && 
                 shouldMonitorElement(mutation.target)) {
        shouldSetup = true;
      }
    });

    if (shouldSetup) {
      debouncedSetup();
    }
  });

  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['contenteditable', 'class', 'id', 'style']
  };

  observer.observe(document.body, config);

  setInterval(debouncedSetup, 2000);
}

document.addEventListener('focus', (event) => {
  const target = event.target;
  if (target instanceof HTMLElement) {
    lastActiveElement = target;
  }
}, true);
