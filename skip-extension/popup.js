const toggle = document.getElementById('toggle');
const statusText = document.getElementById('status-text');
const skipCountEl = document.getElementById('skip-count');
const resetBtn = document.getElementById('reset-btn');
const pulseDot = document.getElementById('pulse-dot');

function updateUI(enabled, count) {
  toggle.checked = enabled;
  skipCountEl.textContent = count;

  if (enabled) {
    statusText.textContent = '● Active';
    statusText.classList.remove('off');
    pulseDot.classList.remove('off');
  } else {
    statusText.textContent = '● Paused';
    statusText.classList.add('off');
    pulseDot.classList.add('off');
  }
}

// Load current state
chrome.storage.sync.get(['enabled', 'skipCount'], (result) => {
  const enabled = result.enabled !== false;
  const count = result.skipCount || 0;
  updateUI(enabled, count);
});

// Toggle enable/disable
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });

  // Send message to all content scripts in current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_ENABLED', enabled }).catch(() => {});
    }
  });

  chrome.storage.sync.get(['skipCount'], (r) => {
    updateUI(enabled, r.skipCount || 0);
  });
});

// Reset counter
resetBtn.addEventListener('click', () => {
  chrome.storage.sync.set({ skipCount: 0 });
  skipCountEl.textContent = '0';
  skipCountEl.classList.add('bump');
  setTimeout(() => skipCountEl.classList.remove('bump'), 200);
  chrome.action.setBadgeText({ text: '' });
});

// Live update if a skip happens while popup is open
chrome.storage.onChanged.addListener((changes) => {
  if (changes.skipCount) {
    const newCount = changes.skipCount.newValue || 0;
    skipCountEl.textContent = newCount;
    skipCountEl.classList.add('bump');
    setTimeout(() => skipCountEl.classList.remove('bump'), 200);
  }
});
