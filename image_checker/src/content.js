// // content.js - Fixed version with proper error handling

// // Check if extension context is valid
// function isExtensionContextValid() {
//   try {
//     return chrome.runtime && chrome.runtime.id;
//   } catch (e) {
//     return false;
//   }
// }

// // Safe message sending
// function sendMessageSafely(message) {
//   if (!isExtensionContextValid()) return;
  
//   try {
//     chrome.runtime.sendMessage(message).catch(() => {
//       // Silently fail if popup isn't open
//     });
//   } catch (error) {
//     // Extension context invalidated or not available
//   }
// }

// // Content script state
// let dragCounter = 0;
// let dragTimer = null;

// // Wait for DOM to be ready
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', initContentScript);
// } else {
//   initContentScript();
// }

// function initContentScript() {
//   // Drag enter detection
//   document.addEventListener('dragenter', (e) => {
//     if (!isExtensionContextValid()) return;
    
//     dragCounter++;
    
//     if (e.dataTransfer && e.dataTransfer.types) {
//       const hasFiles = Array.from(e.dataTransfer.types).includes('Files');
//       const hasImages = Array.from(e.dataTransfer.types).some(type => 
//         type.includes('image') || type.includes('text/uri-list') || type.includes('text/html')
//       );

//       if (hasFiles || hasImages) {
//         if (dragCounter === 1) {
//           if (dragTimer) clearTimeout(dragTimer);
//           sendMessageSafely({ action: 'fileDragDetected' });
//         }
//       }
//     }
//   }, true);

//   // Drag leave detection
//   document.addEventListener('dragleave', (e) => {
//     if (!isExtensionContextValid()) return;
    
//     dragCounter--;
//     if (dragCounter <= 0) {
//       dragTimer = setTimeout(() => {
//         sendMessageSafely({ action: 'resetDragState' });
//       }, 100);
//     }
//   }, true);

//   // Drag over (allow drop)
//   document.addEventListener('dragover', (e) => {
//     if (e.dataTransfer && e.dataTransfer.types) {
//       const hasFiles = Array.from(e.dataTransfer.types).includes('Files');
//       const hasImages = Array.from(e.dataTransfer.types).some(type => 
//         type.includes('image') || type.includes('text/uri-list') || type.includes('text/html')
//       );
      
//       if (hasFiles || hasImages) {
//         e.preventDefault();
//       }
//     }
//   }, true);

//   // Drop detection
//   document.addEventListener('drop', (e) => {
//     if (!isExtensionContextValid()) return;
    
//     dragCounter = 0;
//     let imageProcessed = false;

//     // Handle file drops from computer
//     if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
//       const files = Array.from(e.dataTransfer.files);
//       files.forEach(file => {
//         if (file.type.startsWith('image/')) {
//           imageProcessed = true;
//           e.preventDefault();
//           checkForGPS(file, file.name);
//         }
//       });
//     }

//     // Handle image URL drops from websites
//     if (!imageProcessed && e.dataTransfer) {
//       let imageUrl = null;
//       let imageName = 'dragged-image';

//       // Try different methods to get image URL
//       const uriList = e.dataTransfer.getData('text/uri-list');
//       if (uriList) {
//         imageUrl = uriList.split('\n')[0].trim();
//       }

//       if (!imageUrl) {
//         const html = e.dataTransfer.getData('text/html');
//         if (html) {
//           const parser = new DOMParser();
//           const doc = parser.parseFromString(html, 'text/html');
//           const img = doc.querySelector('img');
//           if (img && img.src) {
//             imageUrl = img.src;
//           }
//         }
//       }

//       if (!imageUrl) {
//         const text = e.dataTransfer.getData('text/plain');
//         if (text && (text.startsWith('http') || text.startsWith('data:'))) {
//           imageUrl = text;
//         }
//       }

//       if (imageUrl) {
//         imageProcessed = true;
//         e.preventDefault();
        
//         try {
//           const urlObj = new URL(imageUrl);
//           const pathname = urlObj.pathname;
//           const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
//           if (filename && filename.includes('.')) {
//             imageName = decodeURIComponent(filename);
//           }
//         } catch (err) {
//           // Use default name
//         }
        
//         checkForGPSFromURL(imageUrl, imageName);
//       }
//     }

//     if (!imageProcessed) {
//       setTimeout(() => {
//         sendMessageSafely({ action: 'resetDragState' });
//       }, 500);
//     }
//   }, true);

//   // File input change detection
//   document.addEventListener('change', (e) => {
//     if (!isExtensionContextValid()) return;
    
//     if (e.target.type === 'file' && e.target.files[0]) {
//       checkForGPS(e.target.files[0], e.target.files[0].name);
//     }
//   }, true);
// }

// // Check local files
// function checkForGPS(file, fileName) {
//   if (!file.type.startsWith('image/')) return;
//   if (!isExtensionContextValid()) return;

//   const reader = new FileReader();
//   reader.onload = (e) => {
//     const img = new Image();
//     img.src = e.target.result;
//     img.onload = () => processImageForGPS(img, fileName);
//   };
//   reader.readAsDataURL(file);
// }

// // Check images from URLs
// function checkForGPSFromURL(imageUrl, fileName) {
//   if (!isExtensionContextValid()) return;
  
//   fetch(imageUrl, {
//     method: 'GET',
//     mode: 'cors',
//     credentials: 'omit'
//   })
//   .then(response => {
//     if (!response.ok) throw new Error('Failed to fetch');
//     return response.blob();
//   })
//   .then(blob => {
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const img = new Image();
//       img.crossOrigin = 'anonymous';
//       img.src = e.target.result;
//       img.onload = () => processImageForGPS(img, fileName);
//     };
//     reader.readAsDataURL(blob);
//   })
//   .catch(error => {
//     // Fallback: try direct load
//     const img = new Image();
//     img.crossOrigin = 'anonymous';
//     img.onload = () => processImageForGPS(img, fileName);
//     img.onerror = () => showErrorAlert(fileName, 'Unable to access image (CORS restriction)');
//     img.src = imageUrl;
//   });
// }

// // Process image for GPS
// function processImageForGPS(img, fileName) {
//   if (!isExtensionContextValid()) return;
  
//   if (typeof EXIF !== 'undefined') {
//     try {
//       EXIF.getData(img, function() {
//         const lat = EXIF.getTag(this, "GPSLatitude");
//         const lon = EXIF.getTag(this, "GPSLongitude");

//         if (lat && lon) {
//           const latRef = EXIF.getTag(this, "GPSLatitudeRef") || 'N';
//           const lonRef = EXIF.getTag(this, "GPSLongitudeRef") || 'E';
//           const coordinates = convertDMSToDD(lat, lon, latRef, lonRef);
          
//           sendMessageSafely({ action: 'gpsDetected' });
//           showGPSAlert(fileName, coordinates);
//         } else {
//           sendMessageSafely({ action: 'imageSafe' });
//           showSafeAlert(fileName);
//         }
//       });
//     } catch (error) {
//       console.log('EXIF processing error:', error);
//     }
//   }
// }

// function convertDMSToDD(lat, lon, latRef, lonRef) {
//   const latDD = lat[0] + lat[1]/60 + lat[2]/3600;
//   const lonDD = lon[0] + lon[1]/60 + lon[2]/3600;
  
//   return {
//     lat: (latRef === 'S' ? -1 : 1) * latDD,
//     lon: (lonRef === 'W' ? -1 : 1) * lonDD
//   };
// }

// // Safe DOM manipulation
// function safelyAppendToBody(element) {
//   try {
//     if (document.body) {
//       document.body.appendChild(element);
//       return true;
//     }
//     return false;
//   } catch (error) {
//     console.log('Cannot append to body:', error);
//     return false;
//   }
// }

// function showGPSAlert(fileName, coordinates) {
//   if (!isExtensionContextValid()) return;
  
//   const existingAlert = document.getElementById('gps-warning-alert');
//   if (existingAlert) {
//     try {
//       existingAlert.remove();
//     } catch (e) {}
//   }

//   const alert = document.createElement('div');
//   alert.id = 'gps-warning-alert';
//   alert.style.cssText = `
//     position: fixed;
//     top: 20px;
//     right: 20px;
//     background: linear-gradient(135deg, #ff4444, #cc0000);
//     color: white;
//     padding: 24px;
//     border-radius: 12px;
//     box-shadow: 0 8px 32px rgba(255, 68, 68, 0.4);
//     z-index: 2147483647;
//     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
//     font-size: 14px;
//     max-width: 380px;
//     animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
//     border: 2px solid rgba(255, 255, 255, 0.2);
//   `;

//   alert.innerHTML = `
//     <div style="display: flex; justify-content: space-between; align-items: start;">
//       <div style="flex: 1;">
//         <div style="font-weight: 700; margin-bottom: 12px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
//           <span>⚠️</span>
//           <span>GPS Data Detected!</span>
//         </div>
//         <div style="font-size: 13px; opacity: 0.95; line-height: 1.5;">
//           <strong style="font-weight: 600;">${truncateFileName(fileName)}</strong> contains location data
//         </div>
//         <div style="font-size: 12px; margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; font-family: monospace;">
//           📍 ${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}
//         </div>
//         <div style="font-size: 12px; margin-top: 12px; opacity: 0.9; line-height: 1.4;">
//           Click the extension icon to remove GPS data.
//         </div>
//       </div>
//       <button id="close-gps-alert" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; padding: 4px 10px; margin-left: 12px; line-height: 1; border-radius: 6px; flex-shrink: 0;">×</button>
//     </div>
//   `;

//   if (safelyAppendToBody(alert)) {
//     const closeBtn = alert.querySelector('#close-gps-alert');
//     if (closeBtn) {
//       closeBtn.addEventListener('click', () => {
//         try {
//           alert.remove();
//         } catch (e) {}
//       });
//       closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(255,255,255,0.3)');
//       closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'rgba(255,255,255,0.2)');
//     }

//     setTimeout(() => {
//       if (alert.parentElement) {
//         try {
//           alert.style.transition = 'opacity 0.3s, transform 0.3s';
//           alert.style.opacity = '0';
//           alert.style.transform = 'translateX(400px)';
//           setTimeout(() => alert.remove(), 300);
//         } catch (e) {}
//       }
//     }, 12000);
//   }
// }

// function showSafeAlert(fileName) {
//   if (!isExtensionContextValid()) return;
  
//   const existingAlert = document.getElementById('gps-safe-alert');
//   if (existingAlert) {
//     try {
//       existingAlert.remove();
//     } catch (e) {}
//   }

//   const alert = document.createElement('div');
//   alert.id = 'gps-safe-alert';
//   alert.style.cssText = `
//     position: fixed;
//     top: 20px;
//     right: 20px;
//     background: linear-gradient(135deg, #28a745, #1e7e34);
//     color: white;
//     padding: 20px 24px;
//     border-radius: 12px;
//     box-shadow: 0 8px 32px rgba(40, 167, 69, 0.3);
//     z-index: 2147483647;
//     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
//     font-size: 14px;
//     max-width: 350px;
//     animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
//     border: 2px solid rgba(255, 255, 255, 0.2);
//   `;

//   alert.innerHTML = `
//     <div style="display: flex; justify-content: space-between; align-items: start;">
//       <div style="flex: 1;">
//         <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
//           <span>✅</span>
//           <span>Image is Safe</span>
//         </div>
//         <div style="font-size: 13px; opacity: 0.95; line-height: 1.5;">
//           <strong style="font-weight: 600;">${truncateFileName(fileName)}</strong> has no GPS data
//         </div>
//       </div>
//       <button id="close-safe-alert" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; padding: 4px 10px; margin-left: 12px; line-height: 1; border-radius: 6px; flex-shrink: 0;">×</button>
//     </div>
//   `;

//   if (safelyAppendToBody(alert)) {
//     const closeBtn = alert.querySelector('#close-safe-alert');
//     if (closeBtn) {
//       closeBtn.addEventListener('click', () => {
//         try {
//           alert.remove();
//         } catch (e) {}
//       });
//       closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(255,255,255,0.3)');
//       closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'rgba(255,255,255,0.2)');
//     }

//     setTimeout(() => {
//       if (alert.parentElement) {
//         try {
//           alert.style.transition = 'opacity 0.3s, transform 0.3s';
//           alert.style.opacity = '0';
//           alert.style.transform = 'translateX(400px)';
//           setTimeout(() => alert.remove(), 300);
//         } catch (e) {}
//       }
//     }, 5000);
//   }
// }

// function showErrorAlert(fileName, errorMessage) {
//   if (!isExtensionContextValid()) return;
  
//   const existingAlert = document.getElementById('gps-error-alert');
//   if (existingAlert) {
//     try {
//       existingAlert.remove();
//     } catch (e) {}
//   }

//   const alert = document.createElement('div');
//   alert.id = 'gps-error-alert';
//   alert.style.cssText = `
//     position: fixed;
//     top: 20px;
//     right: 20px;
//     background: linear-gradient(135deg, #ff9800, #f57c00);
//     color: white;
//     padding: 20px 24px;
//     border-radius: 12px;
//     box-shadow: 0 8px 32px rgba(255, 152, 0, 0.3);
//     z-index: 2147483647;
//     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
//     font-size: 14px;
//     max-width: 350px;
//     animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
//     border: 2px solid rgba(255, 255, 255, 0.2);
//   `;

//   alert.innerHTML = `
//     <div style="display: flex; justify-content: space-between; align-items: start;">
//       <div style="flex: 1;">
//         <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">⚠️ Cannot Check Image</div>
//         <div style="font-size: 13px; opacity: 0.95;">${errorMessage}</div>
//       </div>
//       <button id="close-error-alert" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; padding: 4px 10px; margin-left: 12px; line-height: 1; border-radius: 6px;">×</button>
//     </div>
//   `;

//   if (safelyAppendToBody(alert)) {
//     const closeBtn = alert.querySelector('#close-error-alert');
//     if (closeBtn) {
//       closeBtn.addEventListener('click', () => {
//         try {
//           alert.remove();
//         } catch (e) {}
//       });
//     }

//     setTimeout(() => {
//       if (alert.parentElement) {
//         try {
//           alert.remove();
//         } catch (e) {}
//       }
//     }, 7000);
//   }
// }

// function truncateFileName(fileName, maxLength = 30) {
//   if (fileName.length <= maxLength) return fileName;
//   const extension = fileName.split('.').pop();
//   const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
//   const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
//   return `${truncatedName}...${extension}`;
// }

// // Add animation styles
// const style = document.createElement('style');
// style.textContent = `
//   @keyframes slideInRight {
//     from { transform: translateX(400px); opacity: 0; }
//     to { transform: translateX(0); opacity: 1; }
//   }
// `;
// if (document.head) {
//   document.head.appendChild(style);
// }


// content.js - Fixed version with proper error handling

// Check if extension context is valid
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// Safe message sending
function sendMessageSafely(message) {
  if (!isExtensionContextValid()) return;
  
  try {
    chrome.runtime.sendMessage(message).catch(() => {
      // Silently fail if popup isn't open
    });
  } catch (error) {
    // Extension context invalidated or not available
  }
}

// Content script state
let dragCounter = 0;
let dragTimer = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}

function initContentScript() {
  // Drag enter detection
  document.addEventListener('dragenter', (e) => {
    if (!isExtensionContextValid()) return;
    
    dragCounter++;
    
    if (e.dataTransfer && e.dataTransfer.types) {
      const hasFiles = Array.from(e.dataTransfer.types).includes('Files');
      const hasImages = Array.from(e.dataTransfer.types).some(type => 
        type.includes('image') || type.includes('text/uri-list') || type.includes('text/html')
      );

      if (hasFiles || hasImages) {
        if (dragCounter === 1) {
          if (dragTimer) clearTimeout(dragTimer);
          sendMessageSafely({ action: 'fileDragDetected' });
        }
      }
    }
  }, true);

  // Drag leave detection
  document.addEventListener('dragleave', (e) => {
    if (!isExtensionContextValid()) return;
    
    dragCounter--;
    if (dragCounter <= 0) {
      dragTimer = setTimeout(() => {
        sendMessageSafely({ action: 'resetDragState' });
      }, 100);
    }
  }, true);

  // Drag over (allow drop)
  document.addEventListener('dragover', (e) => {
    if (e.dataTransfer && e.dataTransfer.types) {
      const hasFiles = Array.from(e.dataTransfer.types).includes('Files');
      const hasImages = Array.from(e.dataTransfer.types).some(type => 
        type.includes('image') || type.includes('text/uri-list') || type.includes('text/html')
      );
      
      if (hasFiles || hasImages) {
        e.preventDefault();
      }
    }
  }, true);

  // Drop detection
  document.addEventListener('drop', (e) => {
    if (!isExtensionContextValid()) return;
    
    dragCounter = 0;
    let imageProcessed = false;

    // Handle file drops from computer
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          imageProcessed = true;
          e.preventDefault();
          checkForGPS(file, file.name);
        }
      });
    }

    // Handle image URL drops from websites
    if (!imageProcessed && e.dataTransfer) {
      let imageUrl = null;
      let imageName = 'dragged-image';

      // Try different methods to get image URL
      const uriList = e.dataTransfer.getData('text/uri-list');
      if (uriList) {
        imageUrl = uriList.split('\n')[0].trim();
      }

      if (!imageUrl) {
        const html = e.dataTransfer.getData('text/html');
        if (html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const img = doc.querySelector('img');
          if (img && img.src) {
            imageUrl = img.src;
          }
        }
      }

      if (!imageUrl) {
        const text = e.dataTransfer.getData('text/plain');
        if (text && (text.startsWith('http') || text.startsWith('data:'))) {
          imageUrl = text;
        }
      }

      if (imageUrl) {
        imageProcessed = true;
        e.preventDefault();
        
        try {
          const urlObj = new URL(imageUrl);
          const pathname = urlObj.pathname;
          const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
          if (filename && filename.includes('.')) {
            imageName = decodeURIComponent(filename);
          }
        } catch (err) {
          // Use default name
        }
        
        checkForGPSFromURL(imageUrl, imageName);
      }
    }

    if (!imageProcessed) {
      setTimeout(() => {
        sendMessageSafely({ action: 'resetDragState' });
      }, 500);
    }
  }, true);

  // File input change detection
  document.addEventListener('change', (e) => {
    if (!isExtensionContextValid()) return;
    
    if (e.target.type === 'file' && e.target.files[0]) {
      checkForGPS(e.target.files[0], e.target.files[0].name);
    }
  }, true);
}

// Check local files
function checkForGPS(file, fileName) {
  if (!file.type.startsWith('image/')) return;
  if (!isExtensionContextValid()) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => processImageForGPS(img, fileName);
  };
  reader.readAsDataURL(file);
}

// Check images from URLs
function checkForGPSFromURL(imageUrl, fileName) {
  if (!isExtensionContextValid()) return;
  
  fetch(imageUrl, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit'
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to fetch');
    return response.blob();
  })
  .then(blob => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = e.target.result;
      img.onload = () => processImageForGPS(img, fileName);
    };
    reader.readAsDataURL(blob);
  })
  .catch(error => {
    // Fallback: try direct load
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => processImageForGPS(img, fileName);
    img.onerror = () => showErrorAlert(fileName, 'Unable to access image (CORS restriction)');
    img.src = imageUrl;
  });
}

// Process image for GPS
function processImageForGPS(img, fileName) {
  if (!isExtensionContextValid()) return;
  
  if (typeof EXIF !== 'undefined') {
    try {
      EXIF.getData(img, function() {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const lon = EXIF.getTag(this, "GPSLongitude");

        if (lat && lon) {
          const latRef = EXIF.getTag(this, "GPSLatitudeRef") || 'N';
          const lonRef = EXIF.getTag(this, "GPSLongitudeRef") || 'E';
          const coordinates = convertDMSToDD(lat, lon, latRef, lonRef);
          
          sendMessageSafely({ action: 'gpsDetected' });
          showGPSAlert(fileName, coordinates);
        } else {
          sendMessageSafely({ action: 'imageSafe' });
          // GREEN BOX REMOVED - No notification for safe images
          // showSafeAlert(fileName);
        }
      });
    } catch (error) {
      console.log('EXIF processing error:', error);
    }
  }
}

function convertDMSToDD(lat, lon, latRef, lonRef) {
  const latDD = lat[0] + lat[1]/60 + lat[2]/3600;
  const lonDD = lon[0] + lon[1]/60 + lon[2]/3600;
  
  return {
    lat: (latRef === 'S' ? -1 : 1) * latDD,
    lon: (lonRef === 'W' ? -1 : 1) * lonDD
  };
}

// Safe DOM manipulation
function safelyAppendToBody(element) {
  try {
    if (document.body) {
      document.body.appendChild(element);
      return true;
    }
    return false;
  } catch (error) {
    console.log('Cannot append to body:', error);
    return false;
  }
}

function showGPSAlert(fileName, coordinates) {
  if (!isExtensionContextValid()) return;
  
  const existingAlert = document.getElementById('gps-warning-alert');
  if (existingAlert) {
    try {
      existingAlert.remove();
    } catch (e) {}
  }

  const alert = document.createElement('div');
  alert.id = 'gps-warning-alert';
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff4444, #cc0000);
    color: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(255, 68, 68, 0.4);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    max-width: 380px;
    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    border: 2px solid rgba(255, 255, 255, 0.2);
  `;

  alert.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div style="flex: 1;">
        <div style="font-weight: 700; margin-bottom: 12px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <span>⚠️</span>
          <span>GPS Data Detected!</span>
        </div>
        <div style="font-size: 13px; opacity: 0.95; line-height: 1.5;">
          <strong style="font-weight: 600;">${truncateFileName(fileName)}</strong> contains location data
        </div>
        <div style="font-size: 12px; margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; font-family: monospace;">
          📍 ${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}
        </div>
        <div style="font-size: 12px; margin-top: 12px; opacity: 0.9; line-height: 1.4;">
          Click the extension icon to remove GPS data.
        </div>
      </div>
      <button id="close-gps-alert" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; padding: 4px 10px; margin-left: 12px; line-height: 1; border-radius: 6px; flex-shrink: 0;">×</button>
    </div>
  `;

  if (safelyAppendToBody(alert)) {
    const closeBtn = alert.querySelector('#close-gps-alert');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        try {
          alert.remove();
        } catch (e) {}
      });
      closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(255,255,255,0.3)');
      closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'rgba(255,255,255,0.2)');
    }

    setTimeout(() => {
      if (alert.parentElement) {
        try {
          alert.style.transition = 'opacity 0.3s, transform 0.3s';
          alert.style.opacity = '0';
          alert.style.transform = 'translateX(400px)';
          setTimeout(() => alert.remove(), 300);
        } catch (e) {}
      }
    }, 12000);
  }
}

// showSafeAlert function kept but not called
function showSafeAlert(fileName) {
  // This function is no longer called - kept for reference only
  if (!isExtensionContextValid()) return;
  
  const existingAlert = document.getElementById('gps-safe-alert');
  if (existingAlert) {
    try {
      existingAlert.remove();
    } catch (e) {}
  }

  const alert = document.createElement('div');
  alert.id = 'gps-safe-alert';
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #28a745, #1e7e34);
    color: white;
    padding: 20px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(40, 167, 69, 0.3);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    max-width: 350px;
    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    border: 2px solid rgba(255, 255, 255, 0.2);
  `;

  alert.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div style="flex: 1;">
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <span>✅</span>
          <span>Image is Safe</span>
        </div>
        <div style="font-size: 13px; opacity: 0.95; line-height: 1.5;">
          <strong style="font-weight: 600;">${truncateFileName(fileName)}</strong> has no GPS data
        </div>
      </div>
      <button id="close-safe-alert" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; padding: 4px 10px; margin-left: 12px; line-height: 1; border-radius: 6px; flex-shrink: 0;">×</button>
    </div>
  `;

  if (safelyAppendToBody(alert)) {
    const closeBtn = alert.querySelector('#close-safe-alert');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        try {
          alert.remove();
        } catch (e) {}
      });
      closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(255,255,255,0.3)');
      closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'rgba(255,255,255,0.2)');
    }

    setTimeout(() => {
      if (alert.parentElement) {
        try {
          alert.style.transition = 'opacity 0.3s, transform 0.3s';
          alert.style.opacity = '0';
          alert.style.transform = 'translateX(400px)';
          setTimeout(() => alert.remove(), 300);
        } catch (e) {}
      }
    }, 5000);
  }
}

function showErrorAlert(fileName, errorMessage) {
  if (!isExtensionContextValid()) return;
  
  const existingAlert = document.getElementById('gps-error-alert');
  if (existingAlert) {
    try {
      existingAlert.remove();
    } catch (e) {}
  }

  const alert = document.createElement('div');
  alert.id = 'gps-error-alert';
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff9800, #f57c00);
    color: white;
    padding: 20px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(255, 152, 0, 0.3);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    max-width: 350px;
    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    border: 2px solid rgba(255, 255, 255, 0.2);
  `;

  alert.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div style="flex: 1;">
        <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">⚠️ Cannot Check Image</div>
        <div style="font-size: 13px; opacity: 0.95;">${errorMessage}</div>
      </div>
      <button id="close-error-alert" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; padding: 4px 10px; margin-left: 12px; line-height: 1; border-radius: 6px;">×</button>
    </div>
  `;

  if (safelyAppendToBody(alert)) {
    const closeBtn = alert.querySelector('#close-error-alert');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        try {
          alert.remove();
        } catch (e) {}
      });
    }

    setTimeout(() => {
      if (alert.parentElement) {
        try {
          alert.remove();
        } catch (e) {}
      }
    }, 7000);
  }
}

function truncateFileName(fileName, maxLength = 30) {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
  return `${truncatedName}...${extension}`;
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
if (document.head) {
  document.head.appendChild(style);
}
