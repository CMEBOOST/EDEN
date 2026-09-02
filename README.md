# EDEN — ระบบจัดการหอพัก

```
EDEN/
├── backend-eden/           FastAPI + SQLAlchemy + Alembic (จัดการ dependency ด้วย uv)
├── frontend-eden/          React + Vite + Tailwind
├── docs/                   เอกสาร (ERD ฯลฯ)
├── docker-compose.yml      dev — postgres + pgadmin + backend + frontend (hot reload)
└── docker-compose.prod.yml prod — nginx (SPA + proxy /api) + backend multi-worker + migration one-shot
```

## รันด้วย Docker (dev — ทั้ง stack)

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

### ตั้งค่า (ไฟล์ `.env` ที่ root — ดู `.env.example`)

| ตัวแปร | ใช้ทำอะไร | default |
|---|---|---|
| `POSTGRES_*` / `PGADMIN_*` / `*_PORT` | ค่า Postgres / pgAdmin / พอร์ต host | dev-safe |
| `VITE_API_BASE` | base URL ที่ browser ใช้เรียก backend — เปลี่ยนตอน deploy ไปโดเมนจริง | `http://localhost:8000` |

> `SECRET_KEY` / `FIELD_ENCRYPTION_KEY` อยู่ที่ `backend-eden/.env` แยกต่างหาก

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

## รันแบบ production

```bash
cp .env.prod.example .env          # ตั้ง POSTGRES_PASSWORD, HTTP_PORT ฯลฯ
# ใส่ค่าจริงใน backend-eden/.env : SECRET_KEY, FIELD_ENCRYPTION_KEY
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend uv run python create_admin.py admin <password>
```

- เปิด `http://localhost` (หรือ `HTTP_PORT` ที่ตั้ง) — nginx เสิร์ฟ SPA + proxy `/api/*` ไป backend
- backend / postgres **ไม่ expose** ออก host · ไม่มี pgAdmin
- migration รันเป็น service `migrate` แยก (จบก่อน backend ขึ้น) — ไม่ผูกกับ app start
- backend รันหลาย worker (`WEB_CONCURRENCY`, default 2)
- แยก project จาก dev (`name: eden-prod`) → volume `eden-prod_postgres-data` / `eden-prod_uploads-data` คนละชุด

**backup DB:**
```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres EDEN_DB > backup_$(date +%F).sql
```
