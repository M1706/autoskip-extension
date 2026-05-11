// AutoSkip Content Script
// Watches for skip buttons and clicks them immediately when they appear

const SKIP_SELECTORS = [
  // YouTube
  '.ytp-skip-ad-button',
  '.ytp-ad-skip-button',
  '.ytp-ad-skip-button-modern',
  '[class*="skip-ad"]',
  '[class*="skipAd"]',
  '[id*="skip-ad"]',

  // Generic patterns across video platforms
  '[class*="skip-button"]',
  '[class*="skipButton"]',
  '[id*="skip-button"]',
  '[class*="ad-skip"]',
  '[class*="adSkip"]',

  // Hotstar / Disney+
  '.skip-ad-button',
  '.skip-btn',

  // Peacock, Tubi, Pluto, etc.
  'button[class*="skip"]',
  'div[class*="skip"][role="button"]',
  'span[class*="skip"][role="button"]',
];

let enabled = true;
let skipCount = 0;
let observer = null;

// Load enabled state from storage
chrome.storage.sync.get(['enabled', 'skipCount'], (result) => {
  enabled = result.enabled !== false; // default true
  skipCount = result.skipCount || 0;
  if (enabled) startObserver();
});

// Listen for toggle from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_ENABLED') {
    enabled = message.enabled;
    if (enabled) {
      startObserver();
    } else {
      stopObserver();
    }
    sendResponse({ ok: true });
  }

  if (message.type === 'GET_STATUS') {
    sendResponse({ enabled, skipCount });
  }
});

function trySkip() {
  if (!enabled) return;
  for (const selector of SKIP_SELECTORS) {
    const el = document.querySelector(selector);
    if (el && isVisible(el)) {
      el.click();
      skipCount++;
      chrome.storage.sync.set({ skipCount });
      chrome.runtime.sendMessage({ type: 'SKIPPED', skipCount }).catch(() => {});
      console.log(`[AutoSkip] Clicked: ${selector}`);
      return;
    }
  }
}

function isVisible(el) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

function startObserver() {
  if (observer) return;
  // Initial scan
  trySkip();

  observer = new MutationObserver(() => {
    trySkip();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
