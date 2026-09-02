"""จัดเก็บไฟล์อัปโหลดลงดิสก์ (โฟลเดอร์ backend-eden/uploads/)"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

# .../backend-eden/uploads/
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def save_upload(file: UploadFile) -> str:
    """เซฟไฟล์ คืน path เข้าถึงผ่าน route `GET /uploads/<name>` (ต้องล็อกอิน) เช่น '/uploads/<name>'"""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"ไม่รองรับไฟล์ {ext or '(ไม่มีนามสกุล)'} — รองรับ {', '.join(sorted(ALLOWED_EXT))}",
        )

    name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name

    size = 0
    with dest.open("wb") as out:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="ไฟล์ใหญ่เกิน 10 MB")
            out.write(chunk)

    return f"/uploads/{name}"
