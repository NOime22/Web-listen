document.getElementById('readSelection').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;

  const tabId = tabs[0].id;

  // Try to read selection
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });

    // Execute script to get selection and read
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const selection = window.getSelection().toString().trim();
        return selection;
      }
    }, (results) => {
      const selection = results && results[0] && results[0].result;
      if (selection) {
        chrome.tabs.sendMessage(tabId, { action: 'readText', text: selection });
      } else {
        alert('请先选择要朗读的文本');
      }
    });
    window.close();
  } catch (error) {
    // Inject content script if needed
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['js/content.js']
    });
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const selection = window.getSelection().toString().trim();
          return selection;
        }
      }, (results) => {
        const selection = results && results[0] && results[0].result;
        if (selection) {
          chrome.tabs.sendMessage(tabId, { action: 'readText', text: selection });
        } else {
          alert('请先选择要朗读的文本');
        }
      });
      window.close();
    }, 100);
  }
});

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
