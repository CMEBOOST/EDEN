"""สร้าง user role=admin คนแรกของระบบ

uv run python create_admin.py                 # ถาม username/password
uv run python create_admin.py <user> <pass>   # หรือรับจาก argv
"""

import sys

from app.database import SessionLocal
from app.models import models
from app.core.security import hash_password


def main() -> None:
    if len(sys.argv) >= 3:
        username, password = sys.argv[1], sys.argv[2]
    else:
        username = input("username: ").strip()
        password = input("password: ").strip()

    if not username or not password:
        sys.exit("ต้องกรอกทั้ง username และ password")

    db = SessionLocal()
    try:
        existing = (
            db.query(models.Users).filter(models.Users.username == username).first()
        )
        if existing is not None:
            sys.exit(f"มี username '{username}' อยู่แล้ว (role={existing.role})")

        db.add(
            models.Users(
                username=username,
                password_hash=hash_password(password),
                role=models.Role.admin,
                is_active=True,
            )
        )
        db.commit()
        print(f"สร้าง admin '{username}' เรียบร้อย")
    finally:
        db.close()


if __name__ == "__main__":
    main()
