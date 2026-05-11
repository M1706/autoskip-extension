// AutoSkip Content Script v2
// More aggressive skip button detection for YouTube and other sites

const SKIP_SELECTORS = [
  // YouTube — all known variants (they change these often)
  '.ytp-skip-ad-button',
  '.ytp-skip-ad-button__text',
  '.ytp-ad-skip-button',
  '.ytp-ad-skip-button-modern',
  '.ytp-ad-skip-button-container button',
  '.ytp-ad-skip-button-slot button',
  'button.ytp-skip-ad-button',
  '[class^="ytp-skip"]',
  '[class*="ytp-skip"]',
  '[class*="skip-ad"]',
  '[class*="skipAd"]',
  '[id*="skip-ad"]',

  // YouTube overlay ads
  '.ytp-ad-overlay-close-button',
  '.ytp-ad-overlay-close-container button',

  // Generic patterns
  '[class*="skip-button"]',
  '[class*="skipButton"]',
  '[class*="ad-skip"]',
  '[class*="adSkip"]',
  'button[class*="skip"]',
  'div[class*="skip"][role="button"]',
  'span[class*="skip"][role="button"]',

  // Hotstar
  '.skip-ad-button',
  '.skip-btn',

  // Peacock, Tubi, Pluto
  '[data-testid*="skip"]',
  '[aria-label*="Skip"]',
  '[aria-label*="skip"]',
];

let enabled = true;
let skipCount = 0;
let observer = null;
let intervalId = null;

// Load enabled state from storage
chrome.storage.sync.get(['enabled', 'skipCount'], (result) => {
  enabled = result.enabled !== false;
  skipCount = result.skipCount || 0;
  if (enabled) startWatcher();
});

// Listen for toggle from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_ENABLED') {
    enabled = message.enabled;
    if (enabled) {
      startWatcher();
    } else {
      stopWatcher();
    }
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_STATUS') {
    sendResponse({ enabled, skipCount });
  }
});

function trySkip() {
  if (!enabled) return;

  // Method 1: CSS selector matching
  for (const selector of SKIP_SELECTORS) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (isVisible(el)) {
          el.click();
          skipCount++;
          chrome.storage.sync.set({ skipCount });
          chrome.runtime.sendMessage({ type: 'SKIPPED', skipCount }).catch(() => {});
          console.log(`[AutoSkip] Clicked via selector: ${selector}`);
          return;
        }
      }
    } catch (e) {}
  }

  // Method 2: Search by button text content (catches renamed selectors)
  const skipTexts = ['skip', 'skip ad', 'skip ads', 'skip advertisement'];
  const buttons = document.querySelectorAll('button, [role="button"], div[class*="button"], span[class*="button"]');
  for (const btn of buttons) {
    const text = btn.innerText?.toLowerCase().trim();
    if (skipTexts.some(t => text === t || text?.startsWith('skip ad')) && isVisible(btn)) {
      btn.click();
      skipCount++;
      chrome.storage.sync.set({ skipCount });
      chrome.runtime.sendMessage({ type: 'SKIPPED', skipCount }).catch(() => {});
      console.log(`[AutoSkip] Clicked via text match: "${btn.innerText}"`);
      return;
    }
  }
}

function isVisible(el) {
  try {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      !el.hasAttribute('hidden')
    );
  } catch (e) {
    return false;
  }
}

function startWatcher() {
  if (observer) return;

  // Initial scan
  trySkip();

  // MutationObserver for DOM changes
  observer = new MutationObserver(() => {
    trySkip();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });

  // Fallback interval — catches cases MutationObserver misses
  intervalId = setInterval(trySkip, 500);
}

function stopWatcher() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
