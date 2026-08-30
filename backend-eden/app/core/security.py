"""Password hashing helpers (bcrypt).

ใช้ bcrypt โดย pre-hash ด้วย SHA-256 + base64 ก่อน เพื่อ:
  - เลี่ยงข้อจำกัดของ bcrypt ที่รับ password ได้สูงสุด 72 bytes
  - รองรับรหัสผ่านความยาวเท่าไรก็ได้ / อักขระ unicode

รูปแบบเดียวกับ passlib `bcrypt_sha256` และ Django.
"""
import base64
import hashlib

import bcrypt

# ยิ่งสูงยิ่งช้า (ปลอดภัยขึ้น) — 12 คือค่าที่นิยมใช้กันปี 2020s
BCRYPT_ROUNDS = 12


def _prehash(password: str) -> bytes:
    """SHA-256 ของรหัสผ่าน แล้ว base64 -> ได้ 44 bytes (< 72)."""
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    """แปลงรหัสผ่าน plaintext เป็น hash สำหรับเก็บลง `users.password_hash`."""
    hashed = bcrypt.hashpw(_prehash(password), bcrypt.gensalt(rounds=BCRYPT_ROUNDS))
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """ตรวจว่ารหัสผ่านที่กรอกมา ตรงกับ hash ที่เก็บไว้หรือไม่."""
    try:
        return bcrypt.checkpw(_prehash(password), password_hash.encode("utf-8"))
    except ValueError:
        # hash ในฐานข้อมูลผิดรูปแบบ
        return False
