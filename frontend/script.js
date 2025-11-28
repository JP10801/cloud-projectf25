
// ========================= CONFIG =========================
// Put your container SAS url here (must include list permission)
const AZURE_CONTAINER_SAS_URL = "https://cproject1.blob.core.windows.net/uploads?sp=racwdl&st=2025-11-12T19:05:48Z&se=2026-01-02T03:20:48Z&spr=https&sv=2024-11-04&sr=c&sig=8QUeNMzodMpH6tYgL6VVIzIk%2B4uymfPfbRIXqjDzjB0%3D";

// ========================= DOM refs =========================
const fileInput = document.getElementById("file");
const fileUploadLabel = document.getElementById("fileUploadLabel");
const filesUploadedContainer = document.getElementById("filesUploaded");
const foldersListEl = document.getElementById("foldersList");
const createFolderBtn = document.getElementById("createFolderBtn");
const newFolderNameInput = document.getElementById("newFolderName");
const addRuleBtn = document.getElementById("addRuleBtn");
const ruleExtInput = document.getElementById("ruleExt");
const ruleFolderInput = document.getElementById("ruleFolder");
const rulesListEl = document.getElementById("rulesList");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const refreshBtn = document.getElementById("refreshBtn");
const breadcrumbs = document.getElementById("breadcrumbs");

// ========================= State =========================
const { baseUrl, sas } = parseContainerSas(AZURE_CONTAINER_SAS_URL);
let blobs = []; // list of blobs from container
let folders = new Set(); // folders discovered
let selectedFolder = null; // null => All files
let rules = loadRules(); // extension -> folderName
let lastAccessMap = loadLastAccessMap(); // blobName -> timestamp

// initialize UI
renderRulesUI();
initEventHandlers();
refreshListing();

// ========================= Helpers =========================
function parseContainerSas(sasUrl) {
  const [baseUrl, query] = sasUrl.split("?");
  return { baseUrl, sas: query || "" };
}

function loadRules() {
  try {
    const raw = localStorage.getItem("fileRules");
    return raw ? JSON.parse(raw) : defaultRules();
  } catch (e) { return defaultRules(); }
}
function saveRules() { localStorage.setItem("fileRules", JSON.stringify(rules)); }

function defaultRules() {
  return {
    ".pdf": "PDF",
    ".doc": "MS Word",
    ".docx": "MS Word",
    ".xls": "MS Excel",
    ".xlsx": "MS Excel",
    ".csv": "MS Excel",
    ".mp3": "Audio",
    ".wav": "Audio",
    ".mp4": "Video",
    ".mov": "Video",
    ".png": "Images",
    ".jpg": "Images",
    ".jpeg": "Images",
    ".gif": "Images"
  };
}

function loadLastAccessMap() {
  try { return JSON.parse(localStorage.getItem("lastAccessMap") || "{}"); }
  catch(e){ return {}; }
}
function saveLastAccessMap() { localStorage.setItem("lastAccessMap", JSON.stringify(lastAccessMap)); }

function formatFileSize(size) {
  if (!size) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes","KB","MB","GB","TB"];
  const i = Math.floor(Math.log(size)/Math.log(k));
  return Math.round(100*(size/Math.pow(k,i)))/100 + " " + sizes[i];
}
function truncateName(n, l=32) { return n.length>l ? n.substring(0,l-1)+"..." : n; }

function extensionOf(name) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.substring(dot).toLowerCase();
}

function mapFileToFolder(fileName) {
  const ext = extensionOf(fileName);
  if (ext && rules[ext]) return rules[ext];
  // unknown extension -> create a folder named by extension (without dot) or "Other"
  if (ext) {
    const folderName = ext.replace(".", "").toUpperCase();
    rules[ext] = folderName;
    saveRules();
    renderRulesUI();
    return folderName;
  }
  return "Other";
}

// ========================= UI Actions =========================
function initEventHandlers() {
  // Drag/drop
  fileUploadLabel.addEventListener("dragover", e => { e.preventDefault(); fileUploadLabel.classList.add("drag-over"); });
  fileUploadLabel.addEventListener("dragleave", () => fileUploadLabel.classList.remove("drag-over"));
  fileUploadLabel.addEventListener("drop", e => {
    e.preventDefault(); fileUploadLabel.classList.remove("drag-over");
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", () => handleFiles(fileInput.files));

  createFolderBtn.addEventListener("click", async () => {
    const name = (newFolderNameInput.value || "").trim();
    if (!name) return alert("Folder name required");
    await createFolder(name);
    newFolderNameInput.value = "";
    await refreshListing();
    alert(`Folder "${name}" created`);
  });

  addRuleBtn.addEventListener("click", () => {
    const ext = (ruleExtInput.value || "").trim().toLowerCase();
    const folder = (ruleFolderInput.value || "").trim();
    if (!ext || !folder) return alert("Provide extension (e.g. .pdf) and folder name");
    const key = ext.startsWith(".") ? ext : "." + ext;
    rules[key] = folder;
    saveRules();
    renderRulesUI();
    ruleExtInput.value = "";
    ruleFolderInput.value = "";
  });

  searchInput.addEventListener("input", () => renderFilesView());
  sortSelect.addEventListener("change", () => renderFilesView());
  refreshBtn.addEventListener("click", () => refreshListing());
}

function renderRulesUI() {
  rulesListEl.innerHTML = "";
  const entries = Object.entries(rules).sort((a,b)=>a[0].localeCompare(b[0]));
  entries.forEach(([ext,folder]) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    row.innerHTML = `
      <div>${ext} → <strong>${folder}</strong></div>
      <div>
        <button class="small-btn edit-rule">Edit</button>
        <button class="small-btn delete-rule">Delete</button>
      </div>
    `;
    row.querySelector(".edit-rule").addEventListener("click", () => {
      ruleExtInput.value = ext;
      ruleFolderInput.value = folder;
    });
    row.querySelector(".delete-rule").addEventListener("click", () => {
      if (confirm(`Delete rule for ${ext}?`)) {
        delete rules[ext];
        saveRules();
        renderRulesUI();
      }
    });
    rulesListEl.appendChild(row);
  });
}

// ========================= LISTING =========================
async function refreshListing() {
  try {
    const list = await listBlobs();
    blobs = list;
    discoverFolders();
    renderFoldersUI();
    renderFilesView();
  } catch (err) {
    console.error("Could not list blobs", err);
    alert("Failed to list files. Check SAS permissions and CORS.");
  }
}

async function listBlobs() {
  // Azure List Blobs REST: GET container?restype=container&comp=list
  const url = `${baseUrl}?restype=container&comp=list&${sas}`;
  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) throw new Error(`List failed ${resp.status}`);
  const xml = await resp.text();
  // Parse xml - the <Blob> entries contain <Name> and <Properties>
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const blobNodes = Array.from(doc.querySelectorAll("Blob"));
  const out = blobNodes
    .map(b => {
      const name = b.querySelector("Name")?.textContent || "";
      const props = b.querySelector("Properties");
      const contentLength = parseInt(props?.querySelector("Content-Length")?.textContent || "0", 10);
      const lastModified = props?.querySelector("Last-Modified")?.textContent || null;
      return { name, contentLength, lastModified };
    })
    // Filter out folder placeholder files such as ".placeholder" if you created them
    .filter(b => !b.name.endsWith("/.placeholder"));
  return out;
}

function discoverFolders() {
  folders = new Set();
  blobs.forEach(b => {
    const idx = b.name.indexOf("/");
    const folder = idx === -1 ? "" : b.name.substring(0, idx);
    if (!folder) folders.add("Unsorted");
    else folders.add(folder);
  });
  // ensure folder names from rules exist
  Object.values(rules).forEach(f => folders.add(f));
}

function renderFoldersUI() {
  foldersListEl.innerHTML = "";
  const allBtn = document.createElement("div");
  allBtn.className = `folder-item ${selectedFolder===null ? "active" : ""}`;
  allBtn.textContent = "All files";
  allBtn.addEventListener("click", () => { selectedFolder = null; renderFoldersUI(); renderFilesView(); });
  foldersListEl.appendChild(allBtn);

  Array.from(folders).sort().forEach(f => {
    const item = document.createElement("div");
    item.className = `folder-item ${selectedFolder===f ? "active" : ""}`;
    item.innerHTML = `<span>${f}</span><span class="count">(${countFilesInFolder(f)})</span>`;
    item.addEventListener("click", () => {
      selectedFolder = f;
      renderFoldersUI();
      renderFilesView();
    });
    foldersListEl.appendChild(item);
  });
}

function countFilesInFolder(folder) {
  return blobs.filter(b => getFolderForBlobName(b.name) === folder).length;
}

function getFolderForBlobName(blobName) {
  const idx = blobName.indexOf("/");
  if (idx === -1) {
    // top-level file - try map rule-based folder if possible
    const ext = extensionOf(blobName);
    return rules[ext] || "Unsorted";
  }
  return blobName.substring(0, idx);
}

// ========================= RENDER FILES =========================
function renderFilesView() {
  filesUploadedContainer.innerHTML = "";
  breadcrumbs.textContent = selectedFolder ? `Folder: ${selectedFolder}` : "All files";

  let view = blobs.slice();

  // apply folder filter
  if (selectedFolder) view = view.filter(b => getFolderForBlobName(b.name) === selectedFolder);

  // apply search filter
  const q = (searchInput.value || "").trim().toLowerCase();
  if (q) view = view.filter(b => b.name.toLowerCase().includes(q));

  // decorate with lastAccess for sorting
  view = view.map(b => {
    const lastAccess = lastAccessMap[b.name] ? new Date(lastAccessMap[b.name]) : null;
    return { ...b, lastAccess };
  });

  // sort
  const sortBy = sortSelect.value;
  view.sort((a,b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "size") return (b.contentLength || 0) - (a.contentLength || 0);
    if (sortBy === "created") {
      const da = a.lastModified ? new Date(a.lastModified) : new Date(0);
      const db = b.lastModified ? new Date(b.lastModified) : new Date(0);
      return db - da;
    }
    if (sortBy === "lastAccess") {
      const da = a.lastAccess ? a.lastAccess.getTime() : 0;
      const db = b.lastAccess ? b.lastAccess.getTime() : 0;
      return db - da;
    }
    return 0;
  });

  // render each
  view.forEach(blob => {
    const row = document.createElement("div");
    row.className = "file-item";
    const displayName = blob.name.includes("/") ? blob.name.split("/").slice(1).join("/") : blob.name;
    const size = formatFileSize(blob.contentLength);
    const created = blob.lastModified ? new Date(blob.lastModified).toLocaleString() : "Unknown";
    const lastAcc = lastAccessMap[blob.name] ? new Date(lastAccessMap[blob.name]).toLocaleString() : "—";

    row.innerHTML = `
      <div style="width:40px; text-align:center;">
        <img src="https://img.icons8.com/?size=256&id=11651&format=png" style="width:28px"/>
      </div>
      <div class="file-meta">
        <div class="name">${truncateName(displayName, 48)}</div>
        <div class="meta">
          <div>Size: ${size}</div>
          <div>Created: ${created}</div>
          <div>Last access: ${lastAcc}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="small-btn download-btn">Download</button>
        <button class="small-btn delete-btn">Delete</button>
      </div>
    `;

    // download handler
    row.querySelector(".download-btn").addEventListener("click", () => {
      const dlUrl = `${baseUrl}/${encodeURIComponent(blob.name)}?${sas}`;
      // Update local last access map
      lastAccessMap[blob.name] = new Date().toISOString();
      saveLastAccessMap();
      // open in new tab (will download if content-disposition set or file type)
      window.open(dlUrl, "_blank");
      renderFilesView();
    });

    // delete handler
    row.querySelector(".delete-btn").addEventListener("click", async () => {
      if (!confirm(`Delete "${displayName}"?`)) return;
      try {
        await deleteBlob(blob.name);
        // remove from local maps
        delete lastAccessMap[blob.name];
        saveLastAccessMap();
        await refreshListing();
        alert("Deleted.");
      } catch (err) {
        console.error(err); alert("Delete failed.");
      }
    });

    filesUploadedContainer.appendChild(row);
  });

  if (view.length === 0) {
    filesUploadedContainer.innerHTML = `<div style="color:#666">No files found.</div>`;
  }
}

// ========================= UPLOAD =========================
async function handleFiles(fileList) {
  const files = Array.from(fileList);
  for (const file of files) {
    // determine target folder based on rules
    const folder = mapFileToFolder(file.name);
    if (folder) folders.add(folder);
    // show temporary UI entry
    const fileItem = createUploadingRow(file.name, file.size, folder);
    filesUploadedContainer.prepend(fileItem);

    try {
      const targetName = `${folder}/${file.name}`;
      await uploadToAzureContainer(file, targetName);
      // update UI - success
      setRowUploaded(fileItem, true);
      // After upload, refresh listing so creation time etc. are accurate
      await refreshListing();
      alert(`Uploaded "${file.name}" → ${folder}`);
    } catch (err) {
      console.error("Upload failed:", err);
      setRowUploaded(fileItem, false);
      alert(`Upload failed: ${file.name}`);
    }
  }
}

function createUploadingRow(name, size, folder) {
  const row = document.createElement("div");
  row.className = "file-item";
  row.innerHTML = `
    <div style="width:40px; text-align:center;"><img src="https://img.icons8.com/?size=256&id=11651&format=png" style="width:28px"/></div>
    <div class="file-meta">
      <div class="name">${truncateName(name, 48)}</div>
      <div class="meta">
        <div>Folder: ${folder}</div>
        <div>Size: ${formatFileSize(size)}</div>
        <div class="status">Uploading...</div>
      </div>
    </div>
    <div class="file-actions"></div>
  `;
  return row;
}
function setRowUploaded(row, ok) {
  const statusEl = row.querySelector(".status");
  if (!statusEl) return;
  if (ok) statusEl.textContent = "Uploaded ✓";
  else statusEl.textContent = "Failed ✕";
}

// actual upload - put blob to path (virtual folder)
async function uploadToAzureContainer(file, targetBlobName) {
  const blobUrl = `${baseUrl}/${encodeURIComponent(targetBlobName)}?${sas}`;
  const resp = await fetch(blobUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type || "application/octet-stream"
    },
    body: file
  });
  if (!resp.ok) throw new Error(`Upload failed ${resp.status}`);
  return resp;
}

// ========================= DELETE BLOB =========================
async function deleteBlob(blobName) {
  const url = `${baseUrl}/${encodeURIComponent(blobName)}?${sas}`;
  const resp = await fetch(url, { method: "DELETE" });
  if (!resp.ok) throw new Error(`Delete failed ${resp.status}`);
  return resp;
}

// ========================= CREATE FOLDER =========================
async function createFolder(folderName) {
  // create a placeholder blob so that folder is visible in listings
  const markerName = `${folderName}/.placeholder`;
  const url = `${baseUrl}/${encodeURIComponent(markerName)}?${sas}`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": "application/octet-stream" },
    body: new Blob(["placeholder"])
  });
  if (!resp.ok) throw new Error(`Create folder failed ${resp.status}`);
  // refresh locally
  folders.add(folderName);
  return resp;
}

// ========================= UTIL =========================
function renderMessage(msg) { console.log(msg); }

// End of script




