from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from database import db, UPLOADS_DIR
from auth import get_current_user
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_IMAGE_TYPES = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "image/heic", "image/heif", "image/bmp", "image/tiff",
    "image/svg+xml", "image/avif",
]
MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25MB


async def _process_upload(file: UploadFile):
    content_type = file.content_type or ""
    ext = (file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg").lower()
    
    allowed_extensions = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "tiff", "tif", "svg", "avif"]
    if content_type not in ALLOWED_IMAGE_TYPES and ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Nepodporovaný formát ({ext}). Povolené: JPEG, PNG, WebP, GIF, HEIC, BMP, TIFF, AVIF"
        )
    
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        size_mb = len(contents) / (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Soubor je příliš velký ({size_mb:.1f} MB). Max 25 MB.")
    
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
    
    return {"url": f"/api/uploads/{filename}", "filename": filename}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    return await _process_upload(file)


@router.post("/upload/public")
async def upload_file_public(file: UploadFile = File(...)):
    """Public upload endpoint for registration (no auth required)."""
    return await _process_upload(file)
