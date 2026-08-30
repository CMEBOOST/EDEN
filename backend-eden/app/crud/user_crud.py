from sqlalchemy.orm import Session
from ..models import models
from ..schemas.schemas import User
from ..core.security import hash_password

def create_user(user: User, db: Session):
    new_user = models.Users(
        username = user.username,
        password_hash = hash_password(user.password),
        role = user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user #ช่วงเอาจริง ต้องขึ้นแค่ว่า "create" : "ok"

def get_user(db : Session, skip : int = 0, limit : int = 10):
    return db.query(models.Users).offset(skip).limit(limit).all()

def get_user_by_id(db : Session, user_id : int):
    return db.query(models.Users).filter(models.Users.user_id == user_id).first()