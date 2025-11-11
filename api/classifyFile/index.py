import azure.functions as func
from azure.storage.blob import BlobServiceClient
import json, os, mimetypes

def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        data = req.get_json()
        blob_name = data.get("blobName")
        if not blob_name:
            return func.HttpResponse(
                json.dumps({"error": "Missing 'blobName' in request."}),
                mimetype="application/json",
                status_code=400
            )

        # connect to storage
        account_name = os.environ['AZURE_STORAGE_ACCOUNT_NAME']
        account_key = os.environ['AZURE_STORAGE_ACCOUNT_KEY']
        account_url = f"https://{account_name}.blob.core.windows.net"
        blob_service = BlobServiceClient(account_url, credential=account_key)

        container_name = "uploads"
        blob_client = blob_service.get_blob_client(container_name, blob_name)
        props = blob_client.get_blob_properties()
        content_type = props.content_settings.content_type or mimetypes.guess_type(blob_name)[0]

        # classify
        if content_type and "pdf" in content_type:
            folder = "PDF"
        elif content_type and "audio" in content_type:
            folder = "Audio"
        elif content_type and "video" in content_type:
            folder = "Video"
        elif content_type and "word" in content_type:
            folder = "MS Word"
        else:
            folder = "Others"

        target_container = folder.lower()
        target_blob = f"{target_container}/{blob_name}"

        # Create container if doesn't exist
        try:
            blob_service.create_container(target_container)
        except Exception:
            pass

        # Copy to target and delete from uploads
        blob_service.get_blob_client(target_container, target_blob).start_copy_from_url(blob_client.url)
        blob_client.delete_blob()

        return func.HttpResponse(
            json.dumps({
                "status": "success",
                "message": f"File '{blob_name}' classified as '{folder}'."
            }),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        return func.HttpResponse(
            json.dumps({"status": "error", "message": str(e)}),
            mimetype="application/json",
            status_code=500
        )
