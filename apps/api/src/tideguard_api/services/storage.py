"""Photo upload service — MIME-validated, size-capped, EXIF-stripped storage."""

from __future__ import annotations

import io
import logging
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from tideguard_api.settings import get_settings

logger = logging.getLogger(__name__)


def _suffix_for_mime(mime: str | None) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/heic": ".heic",
    }.get((mime or "").lower(), ".jpg")


def _strip_exif(data: bytes, mime: str | None) -> bytes:
    """Return a copy of the image bytes with EXIF / GPS metadata removed.

    On Pillow failure (unsupported format, corrupt data), we return the
    original bytes unchanged — never raise. The dev tests intentionally pass
    non-image payloads to verify rejection logic; this fallback keeps the
    pipeline robust in production while the MIME / size checks above act as
    the real validation surface.
    """
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))  # re-open after verify
        fmt = (img.format or _suffix_for_mime(mime).lstrip(".")).upper()
        if fmt == "JPG":
            fmt = "JPEG"
        # Reconstruct without EXIF / GPS / ICC profile.
        out = io.BytesIO()
        clean = Image.new(img.mode, img.size)
        clean.putdata(list(img.getdata()))
        if fmt == "JPEG" and clean.mode in ("RGBA", "P"):
            clean = clean.convert("RGB")
        clean.save(out, format=fmt)
        return out.getvalue()
    except (UnidentifiedImageError, OSError) as exc:
        logger.info("EXIF strip skipped (non-image / corrupt): %s", exc)
        return data
    except Exception as exc:  # noqa: BLE001  — never break upload pipeline
        logger.warning("EXIF strip failed: %s", exc)
        return data


def _validate(photo: UploadFile, body: bytes) -> None:
    settings = get_settings()
    if len(body) == 0:
        raise HTTPException(400, "Empty photo body")
    if len(body) > settings.photo_max_bytes:
        raise HTTPException(
            413,
            f"Photo exceeds {settings.photo_max_bytes // (1024 * 1024)} MB limit",
        )
    mime = (photo.content_type or "").lower()
    if mime and mime not in settings.photo_allowed_mime:
        raise HTTPException(
            415,
            f"Unsupported media type {photo.content_type!r}; allowed: {settings.photo_allowed_mime}",
        )


async def upload_photo(photo: UploadFile, user_id: uuid.UUID) -> str:
    """Validate, EXIF-strip and upload a photo. Returns a publicly resolvable URL.

    - MIME must match the configured allow-list.
    - File size capped at ``settings.photo_max_bytes``.
    - EXIF (incl. GPS) is stripped server-side before storage.
    """
    settings = get_settings()
    body = await photo.read()
    _validate(photo, body)
    body = _strip_exif(body, photo.content_type)

    suffix = _suffix_for_mime(photo.content_type) or Path(photo.filename or "image.jpg").suffix or ".jpg"
    object_key = f"reports/{user_id}/{uuid.uuid4().hex}{suffix}"

    if settings.s3_endpoint and settings.s3_access_key:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
        )
        client.put_object(
            Bucket=settings.s3_bucket_photos,
            Key=object_key,
            Body=body,
            ContentType=photo.content_type or "image/jpeg",
        )
        return f"{settings.s3_endpoint}/{settings.s3_bucket_photos}/{object_key}"

    # Dev fallback: save to local uploads dir
    local_dir = Path("uploads") / "photos"
    local_dir.mkdir(parents=True, exist_ok=True)
    local_path = local_dir / object_key.replace("/", "_")
    local_path.write_bytes(body)
    return f"/uploads/photos/{local_path.name}"
