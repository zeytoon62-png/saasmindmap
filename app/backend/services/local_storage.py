"""Local filesystem storage for uploaded files (e.g. wallet QR images).

This replaces the external Object Storage (OSS) service for the standalone
deployment, so uploads/serving work without OSS credentials.
"""

import os
import re

# Where uploaded files live. Override with the UPLOAD_DIR env var.
UPLOAD_BASE_DIR = os.environ.get("UPLOAD_DIR", "/home/deploy/mindmap-data/uploads")


def sanitize_bucket(bucket_name: str) -> str:
    """Keep only safe characters in a bucket name."""
    return re.sub(r"[^a-zA-Z0-9_-]", "", bucket_name or "") or "uploads"


def sanitize_key(object_key: str) -> str:
    """Strip path traversal and leading slashes from an object key."""
    return re.sub(r"\.\.", "", (object_key or "")).strip("/")


def resolve_upload_path(bucket_name: str, object_key: str):
    """Return a safe absolute path under UPLOAD_BASE_DIR, or None if invalid."""
    safe_bucket = sanitize_bucket(bucket_name)
    safe_key = sanitize_key(object_key)
    if not safe_key:
        return None

    base = os.path.realpath(UPLOAD_BASE_DIR)
    path = os.path.realpath(os.path.join(base, safe_bucket, safe_key))
    if os.path.commonpath([base, path]) != base:
        return None
    return path


def ensure_upload_dir(bucket_name: str) -> str:
    """Ensure the upload directory for a bucket exists and return its path."""
    safe_bucket = sanitize_bucket(bucket_name)
    directory = os.path.join(UPLOAD_BASE_DIR, safe_bucket)
    os.makedirs(directory, exist_ok=True)
    return directory
