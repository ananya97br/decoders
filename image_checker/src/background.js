chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "uploadCleanFile") {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      // Only targeting normal web page URLs, not chrome:// or extension pages:
      if (tab && tab.id && tab.url && /^https?:\/\//.test(tab.url)) {
        chrome.tabs.sendMessage(tab.id, request, res => {
          if (chrome.runtime.lastError) {
            alert("Cannot upload: Content script is not loaded in this tab. Please try on a regular website.");
          }
        });
      } else {
        alert("Please navigate to a regular website tab before uploading.");
      }
    });
  }
});

