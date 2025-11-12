const AZURE_CONTAINER_SAS_URL = "https://cproject1.blob.core.windows.net/uploads?sp=racwdl&st=2025-11-12T19:05:48Z&se=2026-01-02T03:20:48Z&spr=https&sv=2024-11-04&sr=c&sig=8QUeNMzodMpH6tYgL6VVIzIk%2B4uymfPfbRIXqjDzjB0%3D";

async function handleFiles(files) {
    const fileList = Array.from(files);

    for (const file of fileList) {
        const fileName = truncateFileName(file.name, 10);
        const fileSize = formatFileSize(file.size);

        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.innerHTML = `
            <div class="file">
                <img src="https://img.icons8.com/?size=256&id=11651&format=png" />
                <span class="file-name">${fileName}</span>
                <span class="file-size">${fileSize}</span>
                <div class="uploaded" id="uploadStatus-${file.name}">
                    <p>Uploading...</p>
                </div>
            </div>
        `;
        filesUploadedContainer.appendChild(fileItem);

        try {
            await uploadToAzureContainer(file);
            document.querySelector(`#uploadStatus-${file.name}`).innerHTML = `
                <img src="https://img.icons8.com/?size=256&id=7690&format=png" />
                <p>Uploaded</p>
            `;
        } catch (err) {
            console.error("Upload failed:", err);
            document.querySelector(`#uploadStatus-${file.name}`).innerHTML = `
                <p style="color:red;">Failed</p>
            `;
        }
    }
}

async function uploadToAzureContainer(file) {
    const [baseUrl, sasToken] = AZURE_CONTAINER_SAS_URL.split("?");
    const blobUrl = `${baseUrl}/${encodeURIComponent(file.name)}?${sasToken}`;

    const response = await fetch(blobUrl, {
        method: "PUT",
        headers: {
            "x-ms-blob-type": "BlockBlob"
        },
        body: file
    });

    if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
    }

    return response;
}
