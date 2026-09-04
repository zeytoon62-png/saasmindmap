import logging
import mimetypes
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from services.local_storage import resolve_upload_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])


@router.get("/{bucket_name}/{object_key:path}")
async def serve_uploaded_file(bucket_name: str, object_key: str):
    """Serve an uploaded file from the local uploads directory."""
    file_path = resolve_upload_path(bucket_name, object_key)
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    content_type, _ = mimetypes.guess_type(file_path)
    return FileResponse(file_path, media_type=content_type or "application/octet-stream")
