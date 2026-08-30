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
