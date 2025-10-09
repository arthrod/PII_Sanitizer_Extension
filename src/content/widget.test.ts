/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeWidget, resetWidgetForTesting } from './widget';
import { Pseudonymizer } from './pseudonymizer';
import { Sanitization } from '../types/types';

const EMAIL_RULE: Sanitization = {
  id: 'email',
  description: 'Email addresses',
  pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
  replacement: 'email@example.com',
  enabled: true,
  isRegex: true,
  pseudonymizeStrategy: 'email'
};

type ChromeLike = {
  storage: {
    local: {
      get: (keys: any, callback: (items: any) => void) => void;
      set: (items: any, callback?: () => void) => void;
    };
  };
};

const createChromeStub = () => {
  const storageCalls: { set: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> } = {
    get: vi.fn((keys, callback) => callback({})),
    set: vi.fn((_items, callback) => {
      if (callback) {
        callback();
      }
    })
  };

  (globalThis as any).chrome = {
    storage: {
      local: storageCalls
    }
  } satisfies ChromeLike;

  return storageCalls;
};

describe('initializeWidget', () => {
  beforeEach(() => {
    resetWidgetForTesting();
    document.body.innerHTML = '';
    createChromeStub();
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
  });

  afterEach(() => {
    resetWidgetForTesting();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).chrome;
  });

  const baseConfig = () => ({
    getSanitizations: () => [EMAIL_RULE],
    pseudonymizer: new Pseudonymizer(),
    onSubmit: vi.fn(() => true),
    showToast: vi.fn(),
    isProminent: false
  });

  it('renders a collapsed widget that can be expanded', () => {
    const config = baseConfig();
    initializeWidget(config);

    const toggle = document.querySelector('.pii-widget__toggle') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    const panel = document.querySelector('.pii-widget__panel');
    expect(panel?.getAttribute('aria-hidden')).toBe('false');
  });

  it('pseudonymizes text and forwards sanitized result on submit', async () => {
    const config = baseConfig();
    initializeWidget(config);

    const toggle = document.querySelector('.pii-widget__toggle') as HTMLButtonElement;
    toggle.click();

    const textarea = document.querySelector('.pii-widget__textarea') as HTMLTextAreaElement;
    textarea.value = 'Contact me at alice@example.com and bob@example.org';

    const submit = document.querySelector('.pii-widget__submit') as HTMLButtonElement;
    submit.click();

    await Promise.resolve();

    expect(config.onSubmit).toHaveBeenCalledTimes(1);
    const result = config.onSubmit.mock.calls[0][0];
    expect(result.text).not.toContain('alice@example.com');
    expect(result.text).not.toContain('bob@example.org');
    expect(result.text).toMatch(/user\d+@example\.com/);
    expect(result.replacementCount).toBeGreaterThanOrEqual(2);

    expect(textarea.value).toBe('');
    expect(document.querySelector('.pii-widget--expanded')).toBeNull();
  });

  it('persists position after dragging', () => {
    const storage = createChromeStub();
    const config = baseConfig();
    initializeWidget(config);

    const toggle = document.querySelector('.pii-widget__toggle') as HTMLButtonElement;
    const startEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0, bubbles: true });
    toggle.dispatchEvent(startEvent);

    const moveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 220, bubbles: true, buttons: 1 });
    document.dispatchEvent(moveEvent);

    const endEvent = new MouseEvent('mouseup', { clientX: 200, clientY: 220, button: 0, bubbles: true });
    document.dispatchEvent(endEvent);

    expect(storage.set).toHaveBeenCalled();
    const payload = storage.set.mock.calls[0][0];
    expect(payload.piiWidgetPosition.left).toBeGreaterThanOrEqual(0);
    expect(payload.piiWidgetPosition.top).toBeGreaterThanOrEqual(0);
  });
});
