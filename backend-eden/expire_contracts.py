"""ตั้งสัญญา active ที่เลย end_date เป็น expired — รันผ่าน cron วันละครั้ง

uv run python expire_contracts.py
"""

from app.crud import contracts_crud
from app.database import SessionLocal


def run(db) -> int:
    return contracts_crud.expire_overdue(db)


def main() -> None:
    db = SessionLocal()
    try:
        n = run(db)
        print(f"expired {n} contract(s)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
