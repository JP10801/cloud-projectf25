const fileInput = document.getElementById('file');
const fileUploadLabel = document.getElementById('fileUploadLabel');
const filesUploadedContainer = document.getElementById('filesUploaded');

fileUploadLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadLabel.classList.add('drag-over');
});

fileUploadLabel.addEventListener('dragleave', () => {
    fileUploadLabel.classList.remove('drag-over');
});

fileUploadLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadLabel.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    handleFiles(files);
});

function handleFiles(files) {
    const fileList = Array.from(files);
    
    fileList.forEach((file) => {
        const fileName = truncateFileName(file.name, 10);
        const fileSize = formatFileSize(file.size);
        
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.innerHTML = `
            <div class= "file">
                <img src="https://img.icons8.com/?size=256&id=11651&format=png" />
                <span class="file-name">${fileName}</span>
                <span class="file-size">${fileSize}</span>
                <div class="uploaded">
                    <img id="checkIcon" src="https://img.icons8.com/?size=256&id=7690&format=png" />
                    <p>Uploaded</p>
                </div>
            </div>
        `;

        filesUploadedContainer.appendChild(fileItem);
    });
}

function truncateFileName(name, maxLength) {
    return name.length > 10 ? name.substring(0, maxLength) + '...' : name;
}

function formatFileSize(size) {
    if (size === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = parseInt(Math.floor(Math.log(size) / Math.log(k)));
    return Math.round(100 * (size / Math.pow(k, i))) / 100 + ' ' + sizes[i];
} 