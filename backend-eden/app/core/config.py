"""ตั้งค่าระบบ อ่านจาก environment variable (โหลด .env ที่ราก backend-eden/ ให้ด้วย)"""

import os
from pathlib import Path

from dotenv import load_dotenv

# .../backend-eden/.env
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# คีย์ลับสำหรับเซ็น JWT — ตั้งผ่าน env SECRET_KEY เสมอใน production
SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# คีย์เข้ารหัสข้อมูล PII ในตาราง (เลขบัตร ปชช.) — Fernet key (base64 32 bytes)
# ไม่ตั้ง = อนุมานจาก SECRET_KEY (dev ใช้ได้เลย) · prod แนะนำให้ตั้งแยก
# gen: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FIELD_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY")
