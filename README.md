# EDEN — ระบบจัดการหอพัก

```
EDEN/
├── backend-eden/           FastAPI + SQLAlchemy + Alembic (จัดการ dependency ด้วย uv)
├── frontend-eden/          React + Vite + Tailwind
├── docs/                   เอกสาร (ERD ฯลฯ)
├── scripts/                backup.sh / restore.sh (pg_dump / pg_restore)
├── docker-compose.yml      dev — postgres + backend + frontend (hot reload) · pgadmin = profile `tools`
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
| postgres | localhost:5433          |

backend container จะรัน `alembic upgrade head` ให้อัตโนมัติตอนสตาร์ต · แก้ `.py` แล้ว **uvicorn reload เอง** (ไม่ต้อง restart) — ยกเว้น migration ใหม่ต้อง `docker compose restart backend`

**pgAdmin** ไม่ start โดยอัตโนมัติ — เปิดเมื่อต้องใช้:
```bash
docker compose --profile tools up -d pgadmin   # http://localhost:5050
```

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

## Format โค้ด

```bash
cd frontend-eden && npm run format        # Prettier (js/jsx/json/css/md) · เช็ค: npm run format:check
cd backend-eden  && uv run ruff format     # Ruff (python) · เช็ค: uv run ruff format --check
```

VSCode: format-on-save เปิดไว้แล้ว (`.vscode/settings.json`) — ลง extension `esbenp.prettier-vscode` + `charliermarsh.ruff`

## รันเทสต์

```bash
# backend — ต้องมี postgres รันอยู่ (docker compose up -d postgres)
cd backend-eden && uv run pytest            # สร้าง DB แยก `eden_test` เอง · coverage สรุปท้าย

# frontend
cd frontend-eden && npm test                # Vitest · watch: npm run test:watch · coverage: npm run test:cov
```

CI รันทั้งสองอัตโนมัติ (`.github/workflows/ci.yml`). มี characterization suite ครอบ RBAC / contract / request workflow / encryption / uploads / audit / dashboard (backend) + invalidation rules / api wrapper / RequireAuth (frontend). เทสต์ที่จงใจ lock พฤติกรรมที่เป็น bug มีคอมเมนต์ `# QUIRK` — `grep -rn QUIRK backend-eden/tests` = checklist งานปิดช่องโหว่

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

## Backup / Restore DB

```bash
scripts/backup.sh                             # dev — → backups/eden_<ts>.dump
scripts/backup.sh -f docker-compose.prod.yml  # prod

scripts/restore.sh backups/eden_<ts>.dump                             # dev  (ถามยืนยัน · หยุด backend ชั่วคราว)
scripts/restore.sh backups/eden_<ts>.dump -f docker-compose.prod.yml  # prod
```

- `-Fc` custom format (บีบอัด) · เก็บใน `backups/` (gitignore) · ลบไฟล์เก่ากว่า `BACKUP_KEEP_DAYS` (default 14)

**ตั้งอัตโนมัติ (cron):**
```bash
# Linux — crontab -e  (ทุกวัน ตี 3)
0 3 * * * cd /path/to/EDEN && scripts/backup.sh -f docker-compose.prod.yml >> backups/cron.log 2>&1
```
```
# Windows — Task Scheduler → Action:
"C:\Program Files\Git\bin\bash.exe" -lc "cd /c/Users/USER/Desktop/EDEN && scripts/backup.sh"
```

## ตั้งสัญญาหมดอายุอัตโนมัติ

`scripts/expire-contracts.sh` — ตั้งสัญญา `active` ที่เลย `end_date` เป็น `expired` (เท่ากับกด `POST /contracts/run-expire`) · idempotent · ต้องมี backend container รันอยู่

```bash
scripts/expire-contracts.sh                             # dev
scripts/expire-contracts.sh -f docker-compose.prod.yml  # prod
```

**ตั้ง cron (ทุกวัน ตี 1):**
```bash
# Linux — crontab -e
0 1 * * * cd /path/to/EDEN && scripts/expire-contracts.sh -f docker-compose.prod.yml >> backups/expire.log 2>&1
```
```
# Windows — Task Scheduler → Action:
"C:\Program Files\Git\bin\bash.exe" -lc "cd /c/Users/USER/Desktop/EDEN && scripts/expire-contracts.sh"
```
