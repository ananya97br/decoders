const dropArea = document.getElementById('dropArea');
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
}