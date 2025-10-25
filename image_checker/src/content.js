// Content script runs on all pages
document.addEventListener('change', (e) => {
  if (e.target.type === 'file' && e.target.files[0]) {
    checkForGPS(e.target.files[0]);
  }
}, true);

document.addEventListener('drop', (e) => {
  if (e.dataTransfer?.files[0]) {
    checkForGPS(e.dataTransfer.files[0]);
  }
}, true);

function checkForGPS(file) {
  if (!file.type.startsWith('image/')) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    
    img.onload = () => {
      if (typeof EXIF !== 'undefined') {
        EXIF.getData(img, function() {
          const lat = EXIF.getTag(this, "GPSLatitude");
          const lon = EXIF.getTag(this, "GPSLongitude");
          
          if (lat && lon) {
            showAlert();
          }
        });
      }
    };
  };
  reader.readAsDataURL(file);
}

function showAlert() {
  const existingAlert = document.getElementById('gps-warning-alert');
  if (existingAlert) existingAlert.remove();
  
  const alert = document.createElement('div');
  alert.id = 'gps-warning-alert';
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: Arial, sans-serif;
    font-size: 14px;
  `;
  alert.innerHTML = `
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">⚠️ WARNING!</div>
    <div>This image contains GPS location data!</div>
    <button id="close-gps-alert" style="
      margin-top: 12px;
      background: white;
      color: #ff4444;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 13px;
    ">Close</button>
  `;
  
  document.body.appendChild(alert);
  
  document.getElementById('close-gps-alert').onclick = () => alert.remove();
  setTimeout(() => alert.remove(), 8000);
}
