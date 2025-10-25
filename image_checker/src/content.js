let dragActive = false;
document.addEventListener("dragenter", e => {
  if (e.dataTransfer?.types?.includes("Files") && !dragActive) {
    dragActive = true;
    chrome.runtime.sendMessage({ action: "openPopup" });
  }
}, true);
["dragend", "dragleave", "drop"].forEach(ev =>
  document.addEventListener(ev, () => { dragActive = false; }, true)
);



