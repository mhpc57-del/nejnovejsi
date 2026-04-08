from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from database import db, UPLOADS_DIR
from auth import get_current_user
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_TYPES = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "image/gif": "gif", "image/heic": "heic", "image/heif": "heif",
    "image/bmp": "bmp", "image/tiff": "tiff", "image/svg+xml": "svg",
    "image/avif": "avif",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt", "text/csv": "csv",
    "application/zip": "zip", "application/x-rar-compressed": "rar",
    "application/x-7z-compressed": "7z",
}

ALLOWED_EXTENSIONS = [
    "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "tiff", "tif", "svg", "avif",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods",
    "zip", "rar", "7z",
]

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB

MIME_MAP = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "webp": "image/webp", "gif": "image/gif", "bmp": "image/bmp",
    "svg": "image/svg+xml", "avif": "image/avif", "tiff": "image/tiff",
    "tif": "image/tiff", "pdf": "application/pdf",
    "doc": "application/msword", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "txt": "text/plain", "csv": "text/csv", "zip": "application/zip",
}


async def _process_upload(file: UploadFile):
    content_type = file.content_type or ""
    ext = (file.filename.split(".")[-1] if file.filename and "." in file.filename else "").lower()

    if content_type not in ALLOWED_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Nepodporovany format ({ext}). Povolene: obrazky, PDF, DOC, XLS, TXT, ZIP"
        )

    if not ext and content_type in ALLOWED_TYPES:
        ext = ALLOWED_TYPES[content_type]

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        size_mb = len(contents) / (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Soubor je prilis velky ({size_mb:.1f} MB). Max 50 MB.")

    if ext in ["heic", "heif"]:
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(contents))
            output = io.BytesIO()
            img.convert("RGB").save(output, format="JPEG", quality=90)
            contents = output.getvalue()
            ext = "jpg"
        except Exception as e:
            logger.warning(f"HEIC conversion failed, saving raw: {e}")

    filename = f"{uuid.uuid4()}.{ext}"

    # Store in MongoDB for persistence across deployments
    await db.file_storage.insert_one({
        "filename": filename,
        "content_type": content_type or MIME_MAP.get(ext, "application/octet-stream"),
        "data": contents,
        "original_name": file.filename,
        "size": len(contents),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Also save to disk for local/preview serving
    try:
        filepath = UPLOADS_DIR / filename
        with open(filepath, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.warning(f"Disk write failed (non-critical): {e}")

    return {"url": f"/api/uploads/{filename}", "filename": filename, "original_name": file.filename}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    return await _process_upload(file)


@router.post("/upload/public")
async def upload_file_public(file: UploadFile = File(...)):
    """Public upload endpoint for registration (no auth required)."""
    return await _process_upload(file)


@router.get("/uploads/{filename}")
async def serve_file(filename: str):
    """Serve uploaded file - from MongoDB first, then disk fallback."""
    # Try MongoDB first (persistent)
    record = await db.file_storage.find_one({"filename": filename}, {"_id": 0, "data": 1, "content_type": 1})
    if record and record.get("data"):
        content_type = record.get("content_type", "application/octet-stream")
        return Response(
            content=record["data"],
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"}
        )

    # Fallback to disk (for old files in preview)
    filepath = UPLOADS_DIR / filename
    if filepath.exists():
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        content_type = MIME_MAP.get(ext, "application/octet-stream")
        with open(filepath, "rb") as f:
            data = f.read()
        return Response(
            content=data,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"}
        )

    raise HTTPException(status_code=404, detail="Soubor nenalezen")
