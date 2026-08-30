from sqlalchemy.orm import Session

from ..models import models
from ..schemas import schemas


def create_rate(db: Session, rate: schemas.RateConfig):
    new_rate = models.RateConfig(
        type=rate.type,
        rate_value=rate.rate_value,
        effective_date=rate.effective_date,
        created_by=rate.created_by,
    )
    db.add(new_rate)
    db.commit()
    db.refresh(new_rate)
    return new_rate


def get_rates(db: Session, type_: str | None = None):
    query = db.query(models.RateConfig)
    if type_ is not None:
        query = query.filter(models.RateConfig.type == type_)
    return query.order_by(models.RateConfig.effective_date.desc()).all()


def get_rate(db: Session, rate_id: int):
    return (
        db.query(models.RateConfig)
        .filter(models.RateConfig.rate_id == rate_id)
        .first()
    )


def update_rate(db: Session, rate_id: int, data: schemas.RateConfigUpdate):
    rate = get_rate(db, rate_id)
    if rate is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rate, field, value)
    db.commit()
    db.refresh(rate)
    return rate


def delete_rate(db: Session, rate_id: int):
    rate = get_rate(db, rate_id)
    if rate is None:
        return None
    db.delete(rate)
    db.commit()
    return rate
