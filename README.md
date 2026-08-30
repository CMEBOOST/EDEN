# EDEN — ระบบจัดการหอพัก

```
EDEN/
├── backend-eden/      FastAPI + SQLAlchemy + Alembic (จัดการ dependency ด้วย uv)
├── frontend-eden/     React + Vite + Tailwind
├── docs/              เอกสาร (ERD ฯลฯ)
└── docker-compose.yml  postgres + pgadmin + backend + frontend
```

## รันด้วย Docker (ทั้ง stack)

```bash
docker compose up -d --build
```

| service  | URL                     |
|----------|-------------------------|
| backend  | http://localhost:8000/docs |
| frontend | http://localhost:5173   |
| pgadmin  | http://localhost:5050   |
| postgres | localhost:5433          |

backend container จะรัน `alembic upgrade head` ให้อัตโนมัติตอนสตาร์ต

## รัน backend แบบ local (ไม่ผ่าน Docker)

ต้องมี postgres รันอยู่ก่อน (`docker compose up -d postgres`)

```bash
cd backend-eden
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

ค่า DB เริ่มต้นชี้ไป `127.0.0.1:5433` — override ได้ด้วย env `DATABASE_URL`

## รัน frontend แบบ local

```bash
cd frontend-eden
npm install
npm run dev
```
