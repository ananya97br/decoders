chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "openPopup") chrome.action.openPopup();
});
