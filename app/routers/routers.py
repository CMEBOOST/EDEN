from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..schemas import schemas
from ..crud import crud
from ..database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/")
def create_user_route(user: schemas.User, db: Session = Depends(get_db)):
    return crud.create_user(db=db, user=user)

@router.get("/")
def get_users_route(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return crud.get_user(db=db, skip=skip, limit=limit)