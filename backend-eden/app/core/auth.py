"""JWT auth — สร้าง token, ดึง current user, ตรวจ role"""
import datetime

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..crud import user_crud
from ..database import get_db
from ..models import models
from .config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="ไม่ได้เข้าสู่ระบบ หรือ token ไม่ถูกต้อง",
    headers={"WWW-Authenticate": "Bearer"},
)


def create_access_token(username: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": username,
        "exp": now + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Users:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
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


def require_roles(*roles: str):
    """dependency: อนุญาตเฉพาะ role ที่ระบุ"""

    def checker(user: models.Users = Depends(get_current_user)) -> models.Users:
        role = user.role.value if hasattr(user.role, "value") else user.role
        if role not in roles:
            raise HTTPException(
                status_code=403, detail="ไม่มีสิทธิ์ใช้งานส่วนนี้"
            )
        return user

    return checker


require_staff = require_roles("admin", "staff")
require_admin = require_roles("admin")
