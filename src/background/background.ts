import { DEFAULT_SANITIZATIONS, DEFAULT_WEBSITES } from '../shared/defaults';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    sanitizations: DEFAULT_SANITIZATIONS.map((sanitization) => ({ ...sanitization })),
    websites: DEFAULT_WEBSITES.map((website) => ({ ...website })),
    isGloballyPaused: false,
    darkMode: true
  });
});

chrome.commands?.onCommand.addListener((command) => {
  if (command !== 'scrub-and-send') {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab?.id !== undefined) {
      chrome.tabs.sendMessage(activeTab.id, { type: 'perform-manual-scrub' });
    }
  });
});
