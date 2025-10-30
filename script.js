// This is a simplified example. In a real application, the SAS token
// should be securely obtained (e.g., from a backend API).
const sasToken = "sp=r&st=2025-10-30T02:52:56Z&se=2026-01-01T12:07:56Z&spr=https&sv=2024-11-04&sr=c&sig=K4rSvUMkECW%2F8u8oVwYwbO5OUb5HphPjveksyoBiBWI%3D"; // Replace with your actual SAS token
const storageAccountName = "cproject1"; // Replace with your storage account name
const containerName = "$logs"; // Replace with your container name

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

    uploadStatus.textContent = "Uploading...";

    try {
        for (const file of files) {
            const blobServiceClient = new Azure.Storage.Blob.BlobServiceClient(
                `https://${cproject1}.blob.core.windows.net?${sp=r&st=2025-10-30T02:52:56Z&se=2026-01-01T12:07:56Z&spr=https&sv=2024-11-04&sr=c&sig=K4rSvUMkECW%2F8u8oVwYwbO5OUb5HphPjveksyoBiBWI%3D}`
            );
            const containerClient = blobServiceClient.getContainerClient($logs);
            const blockBlobClient = containerClient.getBlockBlobClient(file.name);

            await blockBlobClient.uploadBrowserData(file);
            uploadStatus.textContent += `\nUploaded: ${file.name}`;
        }
        uploadStatus.textContent += "\nAll files uploaded successfully!";
    } catch (error) {
        console.error(error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    }
});
