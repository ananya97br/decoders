// Background service worker to handle popup opening
let dragDetected = false;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fileDragDetected") {
    dragDetected = true;
    
    // Open the popup by triggering the action
    chrome.action.openPopup().catch((error) => {
      // If popup can't be opened programmatically (Chrome limitation),
      // show a notification instead
      console.log("Cannot open popup programmatically:", error);
      
      // Alternative: Show a badge on the extension icon
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#FF4444" });
      
      // Clear badge after 3 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 3000);
    });
    
    sendResponse({ received: true });
  }
  
  if (request.action === "resetDragState") {
    dragDetected = false;
    chrome.action.setBadgeText({ text: "" });
    sendResponse({ received: true });
  }
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // This won't fire when default_popup is set, but keeping for reference
  console.log("Extension icon clicked");
});
