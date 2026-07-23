from sqlalchemy.orm import Session
from app.models import models
from app.schemas.schemas import User
from app.database import SessionLocal
from fastapi import Depends


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
    

def create_user(user: User, db: Session):
    new_user = models.Users(
        username = user.username,
        hashed_password = user.password,
        role = user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_user(db : Session, skip : int = 0, limit : int = 10):
    return db.query(models.Users).offset(skip).limit(limit).all()