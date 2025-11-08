import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol, StorageSharedKeyCredential } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

export default async function (context, req) {
  const filename = req.query.filename || "unnamed";
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = "uploads";

  const credentials = new StorageSharedKeyCredential(accountName, accountKey);
  const blobName = `${uuidv4()}-${filename}`;

  const sas = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse("cw"), // create, write
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour
    protocol: SASProtocol.Https,
  }, credentials).toString();

  const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { uploadUrl, blobName }
  };
}
