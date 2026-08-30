from sqlalchemy.orm import Session

from ..core.security import hash_password
from ..models import models
from ..schemas.schemas import User


def create_user(user: User, db: Session):
    new_user = models.Users(
        username=user.username,
        password_hash=hash_password(user.password),
        role=user.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_user(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Users).offset(skip).limit(limit).all()


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.Users).filter(models.Users.user_id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return (
        db.query(models.Users)
        .filter(models.Users.username == username)
        .first()
    )


def set_role(db: Session, user_id: int, role):
    user = get_user_by_id(db, user_id)
    if user is None:
        return None
    user.role = role
    db.commit()
    db.refresh(user)
    return user


def set_active(db: Session, user_id: int, is_active: bool):
    user = get_user_by_id(db, user_id)
    if user is None:
        return None
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, data: dict):
    user = get_user_by_id(db, user_id)
    if user is None:
        return None
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def set_password(db: Session, user_id: int, new_password: str):
    user = get_user_by_id(db, user_id)
    if user is None:
        return None
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user
