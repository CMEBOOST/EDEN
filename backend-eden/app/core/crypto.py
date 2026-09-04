"""เข้ารหัสข้อมูล PII ที่เก็บใน DB (encryption at rest).

ใช้ Fernet (AES-128-CBC + HMAC-SHA256, authenticated) จาก `cryptography`.
`EncryptedStr` เป็น SQLAlchemy column type ที่ encrypt ตอนเขียน / decrypt ตอนอ่าน
— โปร่งใสต่อ ORM / CRUD / schema ทั้งหมด

Key มาจาก env `FIELD_ENCRYPTION_KEY` (Fernet key) — ถ้าไม่ตั้ง จะอนุมานจาก
`SECRET_KEY` แบบ deterministic (พอสำหรับ dev · prod ควรตั้งแยกเพื่อไม่ให้การหมุน
SECRET_KEY ทำให้ข้อมูลเดิมอ่านไม่ออก)
"""

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator

from .config import FIELD_ENCRYPTION_KEY, SECRET_KEY

_log = logging.getLogger("eden.crypto")


def _key() -> bytes:
    if FIELD_ENCRYPTION_KEY:
        return FIELD_ENCRYPTION_KEY.encode()
    return base64.urlsafe_b64encode(
        hashlib.sha256(f"eden-field-v1::{SECRET_KEY}".encode()).digest()
    )


_fernet = Fernet(_key())


def encrypt(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str | None:
    """คืน plaintext · คืน None ถ้า decrypt ไม่ได้ (key ผิด / เป็น plaintext อยู่แล้ว)."""
    try:
        return _fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        _log.warning("decrypt failed (wrong key / not a token)")
        return None


class EncryptedStr(TypeDecorator):
    """VARCHAR ที่ encrypt ตอน bind / decrypt ตอน result — โปร่งใสต่อ ORM."""

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt(value) if value is not None else None

    def process_result_value(self, value, dialect):
        return decrypt(value) if value is not None else None
