chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === "uploadCleanFile") {
    const base64Data = msg.data.split(",")[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: msg.fileType });
    const file = new File([blob], msg.fileName, { type: msg.fileType });

    const input = document.querySelector('input[type="file"]:not([disabled]):not([hidden])');
    if (input) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.warn("No file input element found on the page.");
    }
  }
});

