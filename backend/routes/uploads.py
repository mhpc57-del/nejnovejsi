from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from database import db, UPLOADS_DIR
from auth import get_current_user
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_TYPES = {
    # Images
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "image/gif": "gif", "image/heic": "heic", "image/heif": "heif",
    "image/bmp": "bmp", "image/tiff": "tiff", "image/svg+xml": "svg",
    "image/avif": "avif",
    # Documents
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt", "text/csv": "csv",
    # Archives
    "application/zip": "zip", "application/x-rar-compressed": "rar",
    "application/x-7z-compressed": "7z",
}

ALLOWED_EXTENSIONS = [
    # Images
    "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "tiff", "tif", "svg", "avif",
    # Documents
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods",
    # Archives
    "zip", "rar", "7z",
]

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB


async def _process_upload(file: UploadFile):
    content_type = file.content_type or ""
    ext = (file.filename.split(".")[-1] if file.filename and "." in file.filename else "").lower()

    if content_type not in ALLOWED_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Nepodporovaný formát ({ext}). Povolené: obrázky, PDF, DOC, XLS, TXT, ZIP"
        )

    # Use extension from MIME type if ext is missing
    if not ext and content_type in ALLOWED_TYPES:
        ext = ALLOWED_TYPES[content_type]

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        size_mb = len(contents) / (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Soubor je příliš velký ({size_mb:.1f} MB). Max 50 MB.")

    # HEIC to JPEG conversion for images
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
    filepath = UPLOADS_DIR / filename

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/api/uploads/{filename}", "filename": filename, "original_name": file.filename}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    return await _process_upload(file)


@router.post("/upload/public")
async def upload_file_public(file: UploadFile = File(...)):
    """Public upload endpoint for registration (no auth required)."""
    return await _process_upload(file)
