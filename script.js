const sasToken = "sp=racwdl&st=2025-10-30T03:17:54Z&se=2026-01-01T12:32:54Z&spr=https&sv=2024-11-04&sr=c&sig=6RxjF6PpDbMMfZPlADvL%2BZ%2BpvKxAaCvzV8DYDMlFsys%3D"; 
const storageAccountName = "cproject1"; 
const containerName = "uploads"; // ⚠️ Use your actual writable container

const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const files = fileInput.files;
    if (files.length === 0) {
        uploadStatus.textContent = "Please select files to upload.";
        return;
    }

    uploadStatus.textContent = "Uploading...\n";

    try {
       const blobServiceClient = new AzureStorageBlob.BlobServiceClient(
            `https://${storageAccountName}.blob.core.windows.net?${sasToken}`
        );
        const containerClient = blobServiceClient.getContainerClient(containerName);

        for (const file of files) {
            const blockBlobClient = containerClient.getBlockBlobClient(file.name);
            await blockBlobClient.uploadBrowserData(file);
            uploadStatus.textContent += `Uploaded: ${file.name}\n`;
        }
        uploadStatus.textContent += "All files uploaded successfully!";
    } catch (error) {
        console.error(error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    }
});
