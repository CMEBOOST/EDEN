# FastAPI backend (EDEN) — จัดการ dependency ด้วย uv
FROM python:3.13-slim

# build deps สำหรับ psycopg2 + libpq ตอน runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ติดตั้ง uv (pin เวอร์ชันให้ build ซ้ำได้เหมือนเดิม)
COPY --from=ghcr.io/astral-sh/uv:0.12.7 /uv /uvx /bin/

WORKDIR /app

# ติดตั้ง dependency ก่อน (แยก layer ไว้ใช้ cache)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# ก๊อปปี้โค้ดที่เหลือ
COPY . .
RUN uv sync --frozen

EXPOSE 8000

# รัน migration แล้วค่อยสตาร์ต API
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
