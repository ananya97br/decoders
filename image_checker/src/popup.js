const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const resultDiv = document.getElementById("result");

dropArea.onclick = () => fileInput.click();

dropArea.ondragover = e => {
  e.preventDefault();
  dropArea.style.borderColor = "#0066ff";
};

dropArea.ondragleave = () => {
  dropArea.style.borderColor = "#999";
};

dropArea.ondrop = e => {
  e.preventDefault();
  dropArea.style.borderColor = "#999";
  if (e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0]);
  }
};

fileInput.onchange = e => {
  if (e.target.files[0]) {
    handleFile(e.target.files[0]);
  }
};

function handleFile(file) {
  const fileType = file.type;
  if (fileType.startsWith("image/")) {
    handleImage(file);
  } else if (file.name.toLowerCase().endsWith(".docx")) {
    handleDocx(file);
  } else if (
    fileType === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    handlePDF(file);
  } else {
    resultDiv.textContent = "Unsupported file type. Only images, PDFs and DOCX allowed.";
  }
}

// Remove GPS/location EXIF from image using canvas (strips ALL metadata)
async function handleImage(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    let img = new Image();
    img.onload = function() {
      // Draw image to canvas, strips all EXIF
      let canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      // Export as blob, now GPS/EXIF is removed
      canvas.toBlob(function(cleanedBlob) {
        resultDiv.textContent = "✅ Location and metadata removed. Uploading clean image...";
        sendCleanFileToContentScript(cleanedBlob, file.name, file.type);
      }, file.type || 'image/jpeg', 0.92);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Remove metadata from DOCX using JSZip (removes core.xml and custom.xml)
async function handleDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  zip.remove("docProps/core.xml");
  zip.remove("docProps/custom.xml");
  const cleanedBlob = await zip.generateAsync({ type: "blob" });
  resultDiv.textContent = "✅ All metadata removed. Uploading clean DOCX...";
  sendCleanFileToContentScript(cleanedBlob, file.name, file.type);
}

function handlePDF(file) {
  // PDF metadata removal is complex; notify user no upload for now
  resultDiv.textContent = "PDF upload with metadata stripping not supported currently.";
}

// Send cleaned file to content script for direct upload
function sendCleanFileToContentScript(blob, fileName, fileType) {
  const reader = new FileReader();
  reader.onloadend = () => {
    chrome.runtime.sendMessage({
      action: "uploadCleanFile",
      data: reader.result,
      fileName,
      fileType,
    });
    resultDiv.textContent += `\nCleaned file ready for upload: ${fileName}`;
  };
  reader.readAsDataURL(blob);
}
