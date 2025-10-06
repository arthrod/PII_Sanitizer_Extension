import { sanitizeText, SanitizeResult } from './sanitizer';
import { Pseudonymizer } from './pseudonymizer';
import { Sanitization } from '../types/types';

const STYLE_ID = 'pii-widget-style';
const STORAGE_KEY = 'piiWidgetPosition';
const MIN_MARGIN = 12;

interface WidgetPosition {
  left: number;
  top: number;
}

export interface WidgetConfig {
  getSanitizations: () => Sanitization[];
  pseudonymizer: Pseudonymizer;
  onSubmit: (result: SanitizeResult) => boolean | Promise<boolean>;
  showToast: (message: string) => void;
  isProminent: boolean;
}

interface DragState {
  active: boolean;
  moved: boolean;
  offsetX: number;
  offsetY: number;
}

let widgetRoot: HTMLElement | null = null;
let widgetInitialized = false;
let currentPosition: WidgetPosition | null = null;
const dragState: DragState = { active: false, moved: false, offsetX: 0, offsetY: 0 };

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .pii-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #0f172a;
      min-width: 56px;
      border-radius: 14px;
      box-shadow: 0 15px 35px rgba(15, 23, 42, 0.18);
      overflow: hidden;
      backdrop-filter: blur(8px);
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      background: rgba(255, 255, 255, 0.95);
    }
    .pii-widget:focus-within,
    .pii-widget--expanded {
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.26);
    }
    .pii-widget--prominent .pii-widget__toggle {
      background: #111827;
      color: #f9fafb;
    }
    .pii-widget--prominent .pii-widget__toggle:hover {
      background: #0f172a;
    }
    .pii-widget--dragging {
      cursor: grabbing;
      user-select: none;
      opacity: 0.95;
    }
    .pii-widget__toggle {
      border: none;
      background: #0ea5e9;
      color: #f8fafc;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 14px;
      transition: background 0.2s ease, transform 0.2s ease;
      touch-action: none;
    }
    .pii-widget__toggle:hover {
      background: #0284c7;
    }
    .pii-widget--expanded .pii-widget__toggle {
      border-radius: 14px 14px 0 0;
    }
    .pii-widget__panel {
      display: none;
      padding: 14px;
      background: rgba(248, 250, 252, 0.98);
      border-top: 1px solid rgba(148, 163, 184, 0.24);
      min-width: 320px;
      max-width: 380px;
    }
    .pii-widget--expanded .pii-widget__panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .pii-widget__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      touch-action: none;
    }
    .pii-widget__title {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
    }
    .pii-widget__close {
      border: none;
      background: transparent;
      color: #475569;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      font-size: 16px;
    }
    .pii-widget__close:hover {
      background: rgba(148, 163, 184, 0.16);
    }
    .pii-widget__description {
      font-size: 13px;
      line-height: 1.4;
      color: #475569;
    }
    .pii-widget__textarea {
      width: 100%;
      min-height: 120px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      padding: 10px 12px;
      font-size: 13px;
      resize: vertical;
      background: #ffffff;
      color: #0f172a;
      box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
    }
    .pii-widget__textarea:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
    .pii-widget__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .pii-widget__submit {
      border: none;
      background: #0ea5e9;
      color: #f8fafc;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .pii-widget__submit:hover {
      background: #0284c7;
    }
    .pii-widget__hint {
      font-size: 12px;
      color: #64748b;
      flex: 1;
    }
    .pii-widget__status {
      font-size: 12px;
      color: #0f172a;
      min-height: 16px;
    }
    .pii-widget__status[data-variant='error'] {
      color: #b91c1c;
    }
    .pii-widget__status[data-variant='success'] {
      color: #0f766e;
    }
  `;

  document.head.appendChild(style);
}

function persistPosition(position: WidgetPosition) {
  currentPosition = position;

  if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
    return;
  }

  try {
    chrome.storage.local.set({ [STORAGE_KEY]: position }, () => undefined);
  } catch (error) {
    // Ignore storage errors in contexts without permissions.
  }
}

function applyPosition(left: number, top: number) {
  if (!widgetRoot) {
    return;
  }

  const width = widgetRoot.offsetWidth || 0;
  const height = widgetRoot.offsetHeight || 0;
  const maxLeft = Math.max(MIN_MARGIN, window.innerWidth - width - MIN_MARGIN);
  const maxTop = Math.max(MIN_MARGIN, window.innerHeight - height - MIN_MARGIN);

  const clampedLeft = clamp(left, MIN_MARGIN, maxLeft);
  const clampedTop = clamp(top, MIN_MARGIN, maxTop);

  widgetRoot.style.left = `${clampedLeft}px`;
  widgetRoot.style.top = `${clampedTop}px`;
  widgetRoot.style.right = '';
  widgetRoot.style.bottom = '';

  currentPosition = { left: clampedLeft, top: clampedTop };
}

const handleResize = () => {
  if (currentPosition && widgetRoot) {
    applyPosition(currentPosition.left, currentPosition.top);
  }
};

function attachDrag(handle: HTMLElement) {
  const startDrag = (event: PointerEvent | MouseEvent) => {
    if ('button' in event && event.button !== 0) {
      return;
    }

    if (!widgetRoot) {
      return;
    }

    const rect = widgetRoot.getBoundingClientRect();
    dragState.active = true;
    dragState.moved = false;
    dragState.offsetX = event.clientX - rect.left;
    dragState.offsetY = event.clientY - rect.top;
    widgetRoot.classList.add('pii-widget--dragging');

    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', endDrag);
  };

  const handleDragMove = (event: PointerEvent | MouseEvent) => {
    if (!dragState.active || !widgetRoot) {
      return;
    }

    dragState.moved = true;
    applyPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
  };

  const endDrag = () => {
    if (!dragState.active) {
      return;
    }

    dragState.active = false;
    widgetRoot?.classList.remove('pii-widget--dragging');

    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', endDrag);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', endDrag);

    if (dragState.moved && currentPosition) {
      persistPosition(currentPosition);
    }
  };

  handle.addEventListener('pointerdown', startDrag);
  handle.addEventListener('mousedown', startDrag);
}

function restorePosition() {
  if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
    return;
  }

  try {
    chrome.storage.local.get(STORAGE_KEY, (stored) => {
      const position = stored?.[STORAGE_KEY];
      if (position && typeof position.left === 'number' && typeof position.top === 'number') {
        requestAnimationFrame(() => applyPosition(position.left, position.top));
      }
    });
  } catch (error) {
    // Ignore storage errors.
  }
}

export function initializeWidget(config: WidgetConfig) {
  if (widgetInitialized) {
    return;
  }

  ensureStyles();

  widgetRoot = document.createElement('section');
  widgetRoot.className = 'pii-widget';
  widgetRoot.setAttribute('aria-label', 'PII pseudonymizer');
  widgetRoot.dataset.state = 'collapsed';

  if (config.isProminent) {
    widgetRoot.classList.add('pii-widget--prominent');
  }

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'pii-widget__toggle';
  toggleButton.textContent = 'Pseudonymize text';
  toggleButton.setAttribute('aria-expanded', 'false');
  widgetRoot.appendChild(toggleButton);

  const panel = document.createElement('div');
  panel.className = 'pii-widget__panel';
  panel.setAttribute('aria-hidden', 'true');

  const header = document.createElement('div');
  header.className = 'pii-widget__header';

  const title = document.createElement('span');
  title.className = 'pii-widget__title';
  title.textContent = 'PII Pseudonymizer';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'pii-widget__close';
  closeButton.setAttribute('aria-label', 'Collapse widget');
  closeButton.textContent = '×';

  header.appendChild(title);
  header.appendChild(closeButton);

  const description = document.createElement('p');
  description.className = 'pii-widget__description';
  description.textContent = 'Paste sensitive content here to pseudo-anonymize it before inserting into the prompt.';

  const textarea = document.createElement('textarea');
  textarea.className = 'pii-widget__textarea';
  textarea.placeholder = 'Paste or type text with PII…';
  textarea.setAttribute('aria-label', 'Text to pseudonymize');

  const footer = document.createElement('div');
  footer.className = 'pii-widget__footer';

  const hint = document.createElement('span');
  hint.className = 'pii-widget__hint';
  hint.textContent = 'Press Ctrl+Enter or use the button to insert';

  const submitButton = document.createElement('button');
  submitButton.type = 'button';
  submitButton.className = 'pii-widget__submit';
  submitButton.textContent = 'Insert sanitized text';

  const status = document.createElement('div');
  status.className = 'pii-widget__status';
  status.setAttribute('aria-live', 'polite');

  footer.appendChild(hint);
  footer.appendChild(submitButton);
  footer.appendChild(status);

  panel.appendChild(header);
  panel.appendChild(description);
  panel.appendChild(textarea);
  panel.appendChild(footer);

  widgetRoot.appendChild(panel);
  document.body.appendChild(widgetRoot);

  const setExpanded = (expanded: boolean) => {
    widgetRoot?.classList.toggle('pii-widget--expanded', expanded);
    toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    panel.setAttribute('aria-hidden', expanded ? 'false' : 'true');

    if (expanded) {
      status.textContent = '';
      delete status.dataset.variant;
      requestAnimationFrame(() => {
        try {
          textarea.focus({ preventScroll: true });
        } catch (error) {
          textarea.focus();
        }
      });
    }
  };

  const handleSubmit = async () => {
    const rawText = textarea.value;

    if (!rawText.trim()) {
      status.textContent = 'Enter text to pseudonymize before inserting.';
      status.dataset.variant = 'error';
      config.showToast('Enter text to pseudonymize before inserting');
      textarea.focus();
      return;
    }

    const sanitizations = config.getSanitizations();
    const result = sanitizeText(rawText, sanitizations, {
      cursorPosition: null,
      isPaste: false,
      pseudonymizer: config.pseudonymizer
    });

    const success = await Promise.resolve(config.onSubmit(result));

    if (success) {
      textarea.value = '';
      status.textContent = result.replacementCount > 0
        ? `Inserted ${result.replacementCount} pseudonymized item${result.replacementCount === 1 ? '' : 's'}.`
        : 'Inserted without detected sensitive items.';
      status.dataset.variant = 'success';
      setExpanded(false);
    } else {
      status.textContent = 'Select a prompt field before inserting the sanitized text.';
      status.dataset.variant = 'error';
    }
  };

  const handleToggle = () => {
    const expanded = widgetRoot?.classList.contains('pii-widget--expanded') ?? false;
    setExpanded(!expanded);
  };

  toggleButton.addEventListener('click', handleToggle);
  closeButton.addEventListener('click', () => setExpanded(false));
  submitButton.addEventListener('click', handleSubmit);

  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setExpanded(false);
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  });

  attachDrag(toggleButton);
  attachDrag(header);

  widgetInitialized = true;
  window.addEventListener('resize', handleResize);
  restorePosition();
}

export function resetWidgetForTesting() {
  if (widgetRoot) {
    widgetRoot.remove();
  }

  window.removeEventListener('resize', handleResize);
  widgetRoot = null;
  widgetInitialized = false;
  currentPosition = null;
  dragState.active = false;
  dragState.moved = false;
  dragState.offsetX = 0;
  dragState.offsetY = 0;
}
