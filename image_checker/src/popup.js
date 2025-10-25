const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const resultDiv = document.getElementById("result");
let currentFile = null;
let currentBuffer = null;

dropArea.onclick = () => fileInput.click();
dropArea.ondragover = e => { e.preventDefault(); dropArea.style.borderColor = "#007bff"; };
dropArea.ondragleave = () => { dropArea.style.borderColor = "#99a"; };
dropArea.ondrop = e => {
  e.preventDefault();
  dropArea.style.borderColor = "#99a";
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
};
fileInput.onchange = e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
};

function handleFile(file) {
  currentFile = file;
  if (file.type.startsWith("image/")) handleImage(file);
  else if (file.name.toLowerCase().endsWith(".docx")) handleDocx(file);
  else resultDiv.innerHTML = `<span class="warning">Unsupported file type. Only images and .docx allowed.</span>`;
}

// ==== IMAGE PROCESSING ====
function handleImage(file) {
  resultDiv.innerHTML = `Analyzing <b>${file.name}</b>...`;
  const reader = new FileReader();
  reader.onload = (e) => {
    currentBuffer = e.target.result;
    const img = new Image();
    img.src = currentBuffer;
    img.onload = function() {
      if (typeof EXIF === "undefined") { resultDiv.innerHTML = "exif.js not loaded!"; return; }
      EXIF.getData(img, function() {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const lon = EXIF.getTag(this, "GPSLongitude");
        if (lat && lon) {
          const [flat, flon] = [gpsCoordToFloat(lat), gpsCoordToFloat(lon)];
          resultDiv.innerHTML = `<div class="warning">GPS info found!<br>Lat: <b>${flat}</b><br>Lon: <b>${flon}</b>
         </div>`;
          addRemoveButtonImage();
        } else {
          resultDiv.innerHTML = `<div class="safe">No GPS location in image.</div>`;
        }
      });
    };
  };
  reader.readAsDataURL(file);
}
function gpsCoordToFloat(coord) {
  if (!Array.isArray(coord) || coord.length < 3) return "";
  return (coord[0] + coord[1] / 60 + coord[2] / 3600).toFixed(6);
}
function addRemoveButtonImage() {
  const btn = document.createElement("button");
  btn.className = "remove";
  btn.textContent = "Strip GPS & Download";
  btn.onclick = () => {
    const img = new Image();
    img.src = currentBuffer;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = currentFile.name.replace(/\.(jpg|jpeg|png)$/i, "_clean.$1");
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.92);
    };
  };
  resultDiv.appendChild(btn);
}

// ==== DOCX PROCESSING (SHOW ALL INFO + GPS TAGS) ====
function handleDocx(file) {
  resultDiv.innerHTML = `Reading <b>${file.name}</b>...`;
  const reader = new FileReader();
  reader.onload = async (e) => {
    currentBuffer = e.target.result;
    try {
      if (typeof JSZip === "undefined") { resultDiv.innerHTML = "jszip.min.js not loaded!"; return; }
      const zip = await JSZip.loadAsync(currentBuffer);
      let coreXml = await zip.file("docProps/core.xml")?.async("string");
      if (!coreXml) { resultDiv.innerHTML = "No docProps/core.xml found."; return; }

      // Common doc properties tags
      const infoTags = [
        { tag: "dc:title", label: "Title" },
        { tag: "dc:creator", label: "Author" },
        { tag: "dcterms:created", label: "Created" },
        { tag: "dcterms:modified", label: "Modified" },
        { tag: "cp:lastModifiedBy", label: "Last Modified By" },
        { tag: "cp:keywords", label: "Keywords" },
        { tag: "cp:category", label: "Category" },
        { tag: "cp:contentStatus", label: "Status" },
        { tag: "dc:subject", label: "Subject" }
      ];

      // Extract info tags present
      let metadataFields = [];
      for (let t of infoTags) {
        const match = coreXml.match(new RegExp(`<${t.tag}[^>]*>([^<]+)</${t.tag}>`, "i"));
        if (match && match[1]) metadataFields.push({ tag: t.tag, label: t.label, value: match[1] });
      }

      // Extract coords - heuristic for any tag with lat/lon/coord in name or coords as content
      const gpsPattern = /<([a-zA-Z0-9:_-]+)>(-?\d+(?:\.\d+)?)[,;\s]+(-?\d+(?:\.\d+)?)[^<]*<\/\1>/g; 
      let gpsFields = [];
      let m;
      while ((m = gpsPattern.exec(coreXml))) {
        gpsFields.push({ tag: m[1], label: `[coords] ${m[1]}`, value: `${m[2]}, ${m[3]}` });
      }
      
      let allFields = [...metadataFields, ...gpsFields];
      if (allFields.length === 0) {
        resultDiv.innerHTML = `<div class="safe">No metadata or geolocation info found.</div>`;
        return;
      }

      // Render a checkbox form
      let formHTML = `<form id="metaList" style="text-align:left;">`;
      for (const f of allFields) {
        // Add a Google Maps link if value looks like lat,lon
        let mapLink = '';
        if (/^\-?\d+(\.\d+)?,\s*\-?\d+(\.\d+)?$/.test(f.value)) {
          const [la, lo] = f.value.split(",");
          mapLink = ` <a href="https://maps.google.com/?q=${la.trim()},${lo.trim()}" target="_blank">[Map]</a>`;
        }
        formHTML += `<label><input type="checkbox" checked name="metaTag" value="${f.tag}"> <b>${f.label}</b>: ${f.value}${mapLink}</label><br>`;
      }
      formHTML += `</form><br>`;

      resultDiv.innerHTML = `<div class="warning"><b>Metadata & geolocation found:</b></div>${formHTML}`;
      addRemoveButtonDocx(zip, coreXml, file, allFields.map(f => f.tag));

    } catch (err) {
      resultDiv.innerHTML = `<span class="warning">Error reading DOCX: ${err.message}</span>`;
    }
  };
  reader.readAsArrayBuffer(file);
}

function addRemoveButtonDocx(zip, coreXml, file, allTags) {
  const btn = document.createElement("button");
  btn.className = "remove";
  btn.textContent = "Remove Checked Metadata & Download DOCX";
  btn.onclick = async () => {
    const form = document.getElementById("metaList");
    const checked = Array.from(form.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value);
    let newXml = coreXml;
    for (const tag of checked) {
      const tagRegex = new RegExp(`<${tag}[^>]*>.*?<\\/${tag}>`, "gi");
      newXml = newXml.replace(tagRegex, "");
    }
    zip.file("docProps/core.xml", newXml);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.docx$/i, "_clean.docx");
    a.click();
    URL.revokeObjectURL(url);
    resultDiv.innerHTML += '<div style="color:green;font-weight:bold;">Cleaned file downloaded.</div>';
  };
  resultDiv.appendChild(btn);
}
