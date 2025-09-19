// basic helper toast
function toast(msg){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.classList.add('visible'), 20);
  setTimeout(()=> { t.classList.remove('visible'); setTimeout(()=> t.remove(),300); }, 3500);
}

// drag & drop
const drop = document.getElementById('dropzone');
if (drop){
  ['dragenter','dragover'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('dragover'); }));
  drop.addEventListener('drop', async function(ev){
    const files = Array.from(ev.dataTransfer.files);
    await uploadFiles(files);
  });
  drop.addEventListener('click', ()=> document.getElementById('uploadInput').click());
}

async function uploadFiles(files){
  const form = new FormData();
  files.forEach(f => form.append('newFile', f));
  const resp = await fetch('/upload', { method: 'POST', body: form });
  if (!resp.ok) { toast('Upload failed'); return; }
  const json = await resp.json();
  const failed = json.results.filter(r => !r.ok);
  if (failed.length === 0) toast('All files uploaded successfully');
  else toast('Some uploads failed');
  loadFiles();
}

// load files (with search & sort)
async function loadFiles(){
  const folder = document.getElementById('folderSelect')?.value || '';
  const sort = document.getElementById('sortSelect')?.value || 'name';
  const search = document.getElementById('searchBox')?.value || '';
  const q = new URLSearchParams({ folder, sort, search });
  const resp = await fetch('/api/files?' + q.toString());
  if (!resp.ok) { toast('Failed to load files'); return; }
  const data = await resp.json();
  const tbody = document.getElementById('fileTableBody');
  tbody.innerHTML = '';
  data.files.forEach(f => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    const link = document.createElement('a');
    link.href = '/' + encodeURIComponent(f.folder) + '/' + encodeURIComponent(f.name);
    link.textContent = f.name;
    link.setAttribute('download','');
    link.addEventListener('click', e => { toast('Download started'); });
    nameTd.appendChild(link);
    tr.appendChild(nameTd);
    const folderTd = document.createElement('td'); folderTd.textContent = f.folder; tr.appendChild(folderTd);
    const sizeTd = document.createElement('td'); sizeTd.textContent = f.size; tr.appendChild(sizeTd);
    const actionTd = document.createElement('td');
    const del = document.createElement('button'); del.textContent = 'Delete';
    del.onclick = async () => {
      const ok = confirm('Delete ' + f.name + '?');
      if (!ok) return;
      const dresp = await fetch('/' + encodeURIComponent(f.folder) + '/' + encodeURIComponent(f.name), { method: 'DELETE' });
      if (dresp.ok) { toast('Deleted'); loadFiles(); } else toast('Delete failed');
    };
    actionTd.appendChild(del);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

// create folder and rule handlers
document.addEventListener('DOMContentLoaded', ()=>{
  loadFiles();
  document.getElementById('uploadInput')?.addEventListener('change', e=> uploadFiles(Array.from(e.target.files)));
  document.getElementById('searchBox')?.addEventListener('input', debounce(loadFiles,300));
  document.getElementById('createFolderBtn')?.addEventListener('click', async ()=>{
    const name = document.getElementById('newFolderName').value.trim();
    if (!name) return toast('Enter folder name');
    const resp = await fetch('/api/folders', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name })});
    if (resp.ok) { toast('Folder created'); loadFiles(); } else toast('Folder creation failed');
  });
  document.getElementById('createRuleBtn')?.addEventListener('click', async ()=>{
    const ext = document.getElementById('ruleExt').value.trim();
    const folder = document.getElementById('ruleFolder').value.trim();
    if (!ext || !folder) return toast('Enter extension and folder');
    const resp = await fetch('/api/rules', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ext, folder })});
    if (resp.ok) { toast('Rule added'); loadFiles(); } else toast('Failed to add rule');
  });
});

function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), ms); } }
