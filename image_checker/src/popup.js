/*const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const result = document.getElementById('result');

dropArea.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
  if (e.target.files[0]) checkImage(e.target.files[0]);
};

dropArea.ondragover = (e) => {
  e.preventDefault();
  dropArea.style.borderColor = '#007bff';
};

dropArea.ondragleave = () => {
  dropArea.style.borderColor = '#ccc';
};

dropArea.ondrop = (e) => {
  e.preventDefault();
  dropArea.style.borderColor = '#ccc';
  if (e.dataTransfer.files[0]) checkImage(e.dataTransfer.files[0]);
};

function checkImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    
    img.onload = () => {
      EXIF.getData(img, function() {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const lon = EXIF.getTag(this, "GPSLongitude");
        
        result.style.display = 'block';
        
        if (lat && lon) {
          result.className = 'warning';
          result.innerHTML = '⚠️ <strong>WARNING!</strong><br>This image contains GPS location data!';
        } else {
          result.className = 'safe';
          result.innerHTML = '✅ <strong>Safe!</strong><br>No location data found.';
        }
      });
    };
  };
  reader.readAsDataURL(file);
}*/

// Listen for messages from content script about dragged files
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processDraggedFile") {
    // Handle the dragged file data if needed
    console.log("Received dragged file notification");
  }
});

// Rest of your existing popup.js code...


const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const result = document.getElementById('result');
let currentFile = null;
let currentImageData = null;

dropArea.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
  if (e.target.files[0]) checkImage(e.target.files[0]);
};

dropArea.ondragover = (e) => {
  e.preventDefault();
  dropArea.style.borderColor = '#007bff';
};

dropArea.ondragleave = () => {
  dropArea.style.borderColor = '#ccc';
};

dropArea.ondrop = (e) => {
  e.preventDefault();
  dropArea.style.borderColor = '#ccc';
  if (e.dataTransfer.files[0]) checkImage(e.dataTransfer.files[0]);
};

function checkImage(file) {
  currentFile = file; // Store file reference
  const reader = new FileReader();
  reader.onload = (e) => {
    currentImageData = e.target.result; // Store image data
    const img = new Image();
    img.src = currentImageData;
    img.onload = () => {
      EXIF.getData(img, function() {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const lon = EXIF.getTag(this, "GPSLongitude");
        result.style.display = 'block';
        
        if (lat && lon) {
          result.className = 'warning';
          // Create button element instead of using inline onclick
          result.innerHTML = `
            ⚠️ <strong>WARNING!</strong><br>
            This image contains GPS location data!<br><br>
            <button id="removeGpsBtn" style="
              padding: 10px 20px;
              background: white;
              color: #ff4444;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: bold;
            ">🧹 Remove GPS & Download Clean Image</button>
          `;
          
          // Add event listener to the button after it's created
          const removeBtn = document.getElementById('removeGpsBtn');
          if (removeBtn) {
            removeBtn.addEventListener('click', removeGPSAndDownload);
          }
        } else {
          result.className = 'safe';
          result.innerHTML = '✅ <strong>Safe!</strong><br>No location data found.';
        }
      });
    };
  };
  reader.readAsDataURL(file);
}

// Function to remove GPS and download clean image
function removeGPSAndDownload() {
  if (!currentImageData || !currentFile) {
    alert('No image loaded');
    return;
  }
  
  const img = new Image();
  img.src = currentImageData;
  img.onload = () => {
    // Create canvas to strip EXIF data
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    // Draw image without EXIF metadata
    ctx.drawImage(img, 0, 0);
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Create clean filename
      const originalName = currentFile.name;
      const cleanName = originalName.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, '_clean.$1');
      
      a.href = url;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success message
      result.className = 'safe';
      result.innerHTML = `
        ✅ <strong>Success!</strong><br>
        Clean image downloaded: <strong>${cleanName}</strong><br><br>
        All GPS data has been removed. You can now safely upload this image!
      `;
    }, 'image/jpeg', 0.92); // 92% quality to preserve image quality
  };
}
