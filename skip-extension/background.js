// AutoSkip Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ enabled: true, skipCount: 0 });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SKIPPED') {
    // Update badge with total skip count
    const count = message.skipCount;
    const label = count > 99 ? '99+' : String(count);
    chrome.action.setBadgeText({ text: label });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  }
});
