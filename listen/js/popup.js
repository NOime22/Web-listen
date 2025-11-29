document.getElementById('readScreenshot').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;

  const tabId = tabs[0].id;

  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    chrome.tabs.sendMessage(tabId, { action: 'captureScreen' });
    window.close();
  } catch (error) {
    // Content script not ready, inject it
    console.log('Injecting content script...');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['js/content.js']
    });
    setTimeout(async () => {
      await chrome.tabs.sendMessage(tabId, { action: 'captureScreen' });
      window.close();
    }, 100);
  }
});

document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
