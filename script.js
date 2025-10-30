// This is a simplified example. In a real application, the SAS token
// should be securely obtained (e.g., from a backend API).
const sasToken = "YOUR_SAS_TOKEN_HERE"; // Replace with your actual SAS token
const storageAccountName = "YOUR_STORAGE_ACCOUNT_NAME"; // Replace with your storage account name
const containerName = "YOUR_CONTAINER_NAME"; // Replace with your container name

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
                `https://${storageAccountName}.blob.core.windows.net?${sasToken}`
            );
            const containerClient = blobServiceClient.getContainerClient(containerName);
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
