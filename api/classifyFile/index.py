import azure.functions as func
from azure.storage.blob import BlobServiceClient
import os, mimetypes

def main(event: func.EventGridEvent):
    blob_url = event.get_json()['url']
    account_url = f"https://{os.environ['AZURE_STORAGE_ACCOUNT_NAME']}.blob.core.windows.net"
    blob_service = BlobServiceClient(account_url, credential=os.environ['AZURE_STORAGE_ACCOUNT_KEY'])
    blob_name = blob_url.split("/")[-1]
    container_name = blob_url.split("/")[-2]

    blob_client = blob_service.get_blob_client(container_name, blob_name)
    props = blob_client.get_blob_properties()
    content_type = props.content_settings.content_type or mimetypes.guess_type(blob_name)[0]

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
    except:
        pass

    # Move file to its classified container
    blob_service.get_blob_client(target_container, target_blob).start_copy_from_url(blob_url)

    print(f"File {blob_name} classified as {folder}")
