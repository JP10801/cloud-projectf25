// ✅ Replace this SAS URL with your actual container SAS URL
const AZURE_CONTAINER_SAS_URL =
  "https://cproject1.blob.core.windows.net/uploads?sp=racwdl&st=2025-11-12T19:05:48Z&se=2026-01-02T03:20:48Z&spr=https&sv=2024-11-04&sr=c&sig=8QUeNMzodMpH6tYgL6VVIzIk%2B4uymfPfbRIXqjDzjB0%3D";

// === DOM References ===
const fileInput = document.getElementById("file");
const fileUploadLabel = document.getElementById("fileUploadLabel");
const filesUploadedContainer = document.getElementById("filesUploaded");

// === Drag & Drop Events ===
fileUploadLabel.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileUploadLabel.classList.add("drag-over");
});

fileUploadLabel.addEventListener("dragleave", () => {
  fileUploadLabel.classList.remove("drag-over");
});

fileUploadLabel.addEventListener("drop", (e) => {
  e.preventDefault();
  fileUploadLabel.classList.remove("drag-over");
  handleFiles(e.dataTransfer.files);
});

// === File Input Event ===
fileInput.addEventListener("change", () => handleFiles(fileInput.files));

// === Main Handler ===
async function handleFiles(files) {
  const fileList = Array.from(files);

  for (const file of fileList) {
    const fileName = truncateFileName(file.name, 10);
    const fileSize = formatFileSize(file.size);

    // Create the file item
    const fileItem = document.createElement("div");
    fileItem.classList.add("file-item");
    fileItem.innerHTML = `
      <div class="file">
          <img src="https://img.icons8.com/?size=256&id=11651&format=png" />
          <span class="file-name">${fileName}</span>
          <span class="file-size">${fileSize}</span>
          <div class="uploaded">
              <p>Uploading...</p>
          </div>
      </div>
    `;

    // Append to DOM first
    filesUploadedContainer.appendChild(fileItem);

    // Grab the 'uploaded' div safely
    const statusDiv = fileItem.querySelector(".uploaded");

    try {
      await uploadToAzureContainer(file);
      statusDiv.innerHTML = `
        <img src="https://img.icons8.com/?size=256&id=7690&format=png" />
        <p>Uploaded</p>
      `;
    } catch (err) {
      console.error("Upload failed:", err);
      statusDiv.innerHTML = `<p style="color:red;">Failed</p>`;
    }
  }
}

// === Upload to Azure Blob Storage ===
async function uploadToAzureContainer(file) {
  const [baseUrl, sasToken] = AZURE_CONTAINER_SAS_URL.split("?");
  const blobUrl = `${baseUrl}/${encodeURIComponent(file.name)}?${sasToken}`;

  const response = await fetch(blobUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return response;
}

// === Helper Functions ===
function truncateFileName(name, maxLength) {
  return name.length > maxLength ? name.substring(0, maxLength) + "..." : name;
}

function formatFileSize(size) {
  if (size === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return Math.round(100 * (size / Math.pow(k, i))) / 100 + " " + sizes[i];
}
