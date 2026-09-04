"""JWT auth — สร้าง token, ดึง current user, ตรวจ role"""

import datetime

import jwt
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..crud import user_crud
from ..database import get_db
from ..models import models
from .config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
# แบบไม่บังคับ — ใช้กับ route เสิร์ฟไฟล์ (token อาจมาทาง query แทน)
oauth2_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="ไม่ได้เข้าสู่ระบบ หรือ token ไม่ถูกต้อง",
    headers={"WWW-Authenticate": "Bearer"},
)


def username_from_token(token: str | None) -> str | None:
    """decode token แบบเงียบ ๆ (ใช้ใน audit middleware) — คืน username หรือ None"""
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
    except jwt.PyJWTError:
        return None


def create_access_token(username: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": username,
        "exp": now + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _user_from_token(raw: str | None, db: Session) -> models.Users:
    if not raw:
        raise _credentials_exc
    try:
        username = jwt.decode(raw, SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
    except jwt.PyJWTError:
        raise _credentials_exc
    if not username:
        raise _credentials_exc

    user = user_crud.get_user_by_username(db, username)
    if user is None:
        raise _credentials_exc
    if not user.is_active:
        raise HTTPException(status_code=403, detail="บัญชีนี้ถูกปิดการใช้งาน")
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Users:
    return _user_from_token(token, db)


def get_user_for_file(
    token: str | None = Query(default=None),
    header: str | None = Depends(oauth2_optional),
    db: Session = Depends(get_db),
) -> models.Users:
    """auth สำหรับ route เสิร์ฟไฟล์ — <img>/<a> แนบ header ไม่ได้ จึงรับ token ทาง ?token= ด้วย"""
    return _user_from_token(token or header, db)


def require_roles(*roles: str):
    """dependency: อนุญาตเฉพาะ role ที่ระบุ"""

    def checker(user: models.Users = Depends(get_current_user)) -> models.Users:
        role = user.role.value if hasattr(user.role, "value") else user.role
        if role not in roles:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ใช้งานส่วนนี้")
        return user

    return checker


require_staff = require_roles("admin", "staff")
require_admin = require_roles("admin")
