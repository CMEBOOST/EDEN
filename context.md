# EDEN — Context

เอกสารสรุปบริบทโปรเจกต์ สำหรับคนใหม่ (หรือ AI assistant) อ่านให้เข้าใจภาพรวมเร็ว ๆ
อัปเดตล่าสุด: 2026-08-30

---

## 1. โปรเจกต์นี้คืออะไร

**ระบบจัดการหอพัก / อพาร์ตเมนต์** (My Apartment API — "ระบบจัดการหอพัก")
เก็บข้อมูลผู้เช่า สัญญาเช่า เอกสารผู้เช่า อัตราค่าน้ำ/ไฟ และ audit log
ยังอยู่ช่วง **เริ่มพัฒนา** — โครง data model + โครงโปรเจกต์วางเสร็จแล้ว, business logic ยังทำน้อย

- เจ้าของ/ผู้พัฒนา: นักศึกษา ม.อุบลราชธานี (surachet.se.67@ubu.ac.th)
- repo หลัก: `github.com/CMEBOOST/EDEN.git` (remote `origin`)
- repo เดโม: `github.com/CMEBOOST/EDEN---Demo.git` (remote `demo`)

---

## 2. Tech stack

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2.0 (typed `Mapped[]`), Alembic |
| Package manager | **uv** (`pyproject.toml` + `uv.lock`) |
| DB | PostgreSQL 16 |
| Auth/hash | bcrypt (pre-hash SHA-256) |
| Frontend | React 19, Vite, React Router 7, Tailwind CSS 4 |
| Infra | Docker Compose (postgres, pgadmin, backend, frontend) |

---

## 3. โครงสร้างโฟลเดอร์

```
EDEN/
├── backend-eden/              # FastAPI backend (แยกออกมาเป็นเอกเทศ)
│   ├── app/
│   │   ├── main.py            # FastAPI app + CORS + mount /uploads + include routers
│   │   ├── database.py        # engine / SessionLocal / get_db / Base (โหลด .env)
│   │   ├── models/models.py   # ORM models ทั้งหมด (source of truth ของ schema)
│   │   ├── schemas/schemas.py # Pydantic schemas
│   │   ├── crud/*_crud.py     # user_crud, tenent_crud, contracts_crud, checklist_crud, document_crud, rate_crud
│   │   ├── routers/routers.py # ทุก API endpoint (auth_router, router, tenant/contract/rate/... )
│   │   └── core/
│   │       ├── security.py    # hash_password / verify_password (bcrypt)
│   │       ├── auth.py        # JWT: create_access_token, get_current_user, require_roles/require_staff/require_admin
│   │       └── config.py      # SECRET_KEY ฯลฯ จาก .env
│   ├── alembic/versions/      # 92c0fb6fb117 (init) → 1dd5441d68a1 (unique rate type+date)
│   ├── alembic.ini · main.py (shim) · Dockerfile / .dockerignore
│   ├── create_admin.py        # seed admin คนแรก
│   ├── .env (gitignore) / .env.example
│   └── pyproject.toml / uv.lock / .python-version
│
├── frontend-eden/             # React + Vite — src/ จัดเป็น module-based
│   ├── src/
│   │   ├── App.jsx (routing + <RequireAuth>)  main.jsx  index.css
│   │   ├── lib/          # api.js (Bearer header, 401→logout, apiGet/Post/Put/Patch/Delete/Upload/Login), auth.js (token), datetime.js
│   │   ├── auth/         # AuthContext.jsx (useAuth: user/login/logout), RequireAuth.jsx
│   │   ├── components/   # ConfirmDialog.jsx, FileDropField.jsx
│   │   ├── layout/       # Sidebar.jsx (ซ่อนเมนู admin), Topbar.jsx (ชื่อ+role+logout)
│   │   ├── pages/        # Login.jsx, Home.jsx, About.jsx, Menu.jsx
│   │   └── modules/
│   │       ├── users/     Users.jsx (จัดการสิทธิ์ /permission — admin), UserForm.jsx
│   │       ├── tenants/   Tenants.jsx (list+CRUD), TenantForm.jsx
│   │       ├── contracts/ Contracts.jsx (list+แก้/ลบ), ContractForm.jsx (/contracts/new — 3 ส่วน),
│   │       │              ContractEditForm.jsx, ChecklistEditor.jsx, DocumentUploader.jsx
│   │       └── rates/     Rates.jsx (list+CRUD ค่าน้ำ/ค่าไฟ), RateForm.jsx
│   ├── Dockerfile
│   └── package.json / vite.config.js
│
├── docs/database_erd.drawio   # ERD (เปิดด้วย diagrams.net / Draw.io extension)
├── docker-compose.yml
├── README.md
└── context.md                # ← ไฟล์นี้
```

> ประวัติ: เดิม backend อยู่ที่ root แล้วย้ายเข้า `backend-eden/` (commit `36f5c8a`)
> ถ้าเจอ path เก่าใน notes/issue ให้เผื่อใจว่าย้ายแล้ว

---

## 4. Data model (PostgreSQL)

Source of truth = [backend-eden/app/models/models.py](backend-eden/app/models/models.py)
ทุกตาราง (ยกเว้น `audit_logs`) มี `created_at` / `updated_at` (`timestamptz`, default `now()`) ผ่าน `TimestampMixin`

| ตาราง | PK | คอลัมน์สำคัญ | FK |
|---|---|---|---|
| `users` | user_id | username (uq), password_hash, role, is_active | — |
| `tenants` | tenant_id | full_name, phone, email, national_id_encrypted, last_login_at | user_id → users |
| `tenant_documents` | doc_id | doc_type, file_url | tenant_id → tenants, uploaded_by → users |
| `contracts` | contract_id | start/end_date, rent, security_deposit, status, room_id* | tenant_id → tenants, created_by → users |
| `contract_checklists` | cc_id | type (check-in/out), checklist_items (JSON), photo_urls (JSON), tenant_signature | contract_id → contracts, created_by → users |
| `rate_configs` | rate_id | type (water/electric), rate_value, effective_date · **UNIQUE(type, effective_date)** | created_by → users |
| `audit_logs` | log_id | action, created_at | user_id → users |

\* `room_id` ยังเป็น nullable ไม่มี FK — ตาราง `rooms` ยังไม่ทำ (Demo)

**Enums** (เก็บเป็น *value* ใน DB ผ่าน helper `_enum_col`):
- `role_enum`: admin / staff / tenant
- `contract_status_enum`: draft / active / expired / terminated
- `checklist_type_enum`: check-in / check-out
- `rate_type_enum`: water / electric

**ความสัมพันธ์หลัก:** `users` 1─N แทบทุกตาราง (ในฐานะผู้สร้าง/ผู้อัปโหลด),
`tenants` 1─N `tenant_documents` / `contracts`, `contracts` 1─N `contract_checklists`

---

## 5. API (ปัจจุบัน)

Base: `http://localhost:8000` · Swagger: `/docs`

| method | path | หมายเหตุ |
|---|---|---|
| GET | `/` | health check |
| POST | `/auth/login` | form (`username`,`password`) → `{access_token, token_type}` (JWT) |
| GET | `/auth/me` | ข้อมูล user ที่ล็อกอิน (`UserOut`) |
| POST/GET | `/users/` | สร้าง (admin) / list (staff+) — คืน `UserOut` (ไม่มี password_hash) |
| GET/PATCH | `/users/{id}` | อ่าน (staff+) / เปิด-ปิด `is_active` (admin) |
| PATCH | `/users/{id}/role` | เปลี่ยน role (admin) — เปลี่ยนของตัวเองไม่ได้ (400) |
| POST | `/upload/` | อัปโหลดไฟล์ 1 ไฟล์ (multipart `file`) → `{url, filename}` · จำกัด jpg/png/webp/gif/pdf ≤ 10MB |
| GET | `/uploads/<name>` | เสิร์ฟไฟล์ที่อัปโหลด (StaticFiles จาก `backend-eden/uploads/`) |
| POST/GET | `/tenants/` | สร้าง / list (create เช็ค `user_id` มีจริง) |
| GET/PUT/DELETE | `/tenants/{id}` | อ่าน / แก้ (`TenantUpdate`) / ลบ |
| POST/GET | `/tenants/{id}/documents` | เอกสารของผู้เช่า (`{doc_type, file_url, uploaded_by?}`) |
| DELETE | `/documents/{doc_id}` | ลบเอกสาร |
| POST/GET | `/contracts/` | สร้าง / list (query `tenant_id`) · create เช็ค tenant + วันที่ |
| GET/PUT/DELETE | `/contracts/{id}` | อ่าน / แก้ (`ContractUpdate`) / ลบ |
| POST/GET | `/contracts/{id}/checklists` | บันทึกสภาพห้อง — `{type, items:[{name,status,note,photos}], tenant_signature?}` → เก็บ `checklist_items` (JSON) + `photo_urls` (flat) |
| POST/GET | `/rates/` | อัตราค่าน้ำ/ค่าไฟ (`{type: water\|electric, rate_value, effective_date}`) · query `type` · POST ชน `(type, effective_date)` เดิม → **409** `{message, existing_rate_id}` |
| GET | `/rates/current` | อัตราที่มีผล ณ วันนี้ (หรือ `?date=`) → `{water: {...}\|null, electric: {...}\|null}` |
| GET/PUT/DELETE | `/rates/{rate_id}` | อ่าน / แก้ (`RateConfigUpdate`, PUT เข้า slot ที่มีแล้ว → 409) / ลบ |

**Auth:** ทุก endpoint (ยกเว้น `/auth/login`) ต้องส่ง header `Authorization: Bearer <JWT>` · route ที่เขียนข้อมูล (POST/PUT/PATCH/DELETE) ต้องเป็น role `staff` หรือ `admin` · `/users/*` จัดการสิทธิ์ = `admin` เท่านั้น · `/uploads/<file>` (static) ยังเปิดอ่านได้ไม่ต้อง token (dev)

> `/tenants/` ยังคืน `national_id_encrypted` (ยังไม่มี response schema แยก) · `created_by`/`uploaded_by` ยัง `null` (ยังไม่ set จาก current user)

---

## 6. วิธีรัน

### Docker (ทั้ง stack)
```bash
docker compose up -d --build
```
| service | URL |
|---|---|
| backend | http://localhost:8000/docs |
| frontend | http://localhost:5173 |
| pgadmin | http://localhost:5050 (admin@example.com / admin123) |
| postgres | localhost:5433 (postgres / admin123 / EDEN_DB) |

backend container รัน `alembic upgrade head` อัตโนมัติตอนสตาร์ต
**ล็อกอินครั้งแรก:** `admin` / `admin123` (มีอยู่แล้วใน dev DB) — หรือสร้างใหม่ `cd backend-eden && uv run python create_admin.py <user> <pass>`

### Local — backend
```bash
docker compose up -d postgres          # ต้องมี DB ก่อน
cd backend-eden
uv sync
cp .env.example .env                   # แล้วตั้ง SECRET_KEY
uv run alembic upgrade head
uv run python create_admin.py admin admin123   # ถ้ายังไม่มี admin
uv run uvicorn app.main:app --reload
```

### Local — frontend
```bash
cd frontend-eden
npm install
npm run dev
```

---

## 7. Config / ตัวแปรสำคัญ

- **DB URL**: `app/database.py` อ่านจาก env `DATABASE_URL`
  - default (local): `postgresql://postgres:admin123@127.0.0.1:5433/EDEN_DB`
  - ใน Docker: `docker-compose.yml` ตั้ง `DATABASE_URL=...@postgres:5432/EDEN_DB`
  - `alembic/env.py` ใช้ URL เดียวกันนี้ (override `sqlalchemy.url` ใน `alembic.ini`)
- **CORS**: `app/main.py` อนุญาตเฉพาะ `http://localhost:5173`
- **`SECRET_KEY`** (เซ็น JWT) + `ACCESS_TOKEN_EXPIRE_MINUTES` อยู่ใน `backend-eden/.env` (gitignore) — `config.py` โหลดให้ · ดู `.env.example`
- **สร้าง admin คนแรก:** `cd backend-eden && uv run python create_admin.py <user> <pass>` (มี `admin` / `admin123` อยู่แล้วสำหรับ dev)
- DB password ยัง hard-code `admin123` ใน compose — dev only
- data volume: **named volumes** `eden_postgres-data`, `eden_pgadmin-data` (Docker จัดการเอง)
  - อยู่รอด `docker compose down` — ลบเฉพาะ `docker compose down -v` หรือ `docker volume rm`
  - โฟลเดอร์ `postgres-data/` `pgadmin-data/` ที่ root เป็นของเก่า (สมัย bind mount) เลิกใช้แล้ว ลบทิ้งได้

---

## 8. Convention / รูปแบบที่ใช้

- โค้ด + คอมเมนต์ + UI = **ภาษาไทย** เป็นหลัก
- SQLAlchemy 2.0 style: `Mapped[...]` + `mapped_column(...)`, ไม่ใช้ `Column()` แบบเก่า
- ชื่อตาราง: snake_case พหูพจน์ · PK: `<entity>_id`
- schema changes → แก้ `models.py` แล้ว `uv run alembic revision --autogenerate -m "..."` → `alembic upgrade head`
- **เวลา**: DB เก็บ `timestamptz` เต็ม ๆ (UTC) — จัดรูปแบบตอนแสดงผลที่ frontend (`utils/datetime.js`, timezone Asia/Bangkok)
- password: `hash_password()` / `verify_password()` จาก `app/core/security.py` เท่านั้น อย่าเก็บ plaintext
- **rate_configs = effective-dated history**: แต่ละแถว = "ตั้งแต่ `effective_date` เรทคือ X" · หลายแถวต่อ type = ประวัติ (ปกติ) · แถวใหม่ปิดแถวเก่าเอง ไม่มี `end_date` · อัตราปัจจุบัน = `effective_date` ล่าสุดที่ ≤ วันนี้ (ใช้ `GET /rates/current` หรือ `rate_crud.get_effective_rate`)
- git: commit ท้ายข้อความใส่ `Co-Authored-By: Claude ...` เมื่อใช้ AI ช่วย

---

## 9. สถานะ / สิ่งที่ยังต้องทำ (TODO)

**Backend**
- [x] endpoint: auth (login/JWT) / users (จัดการสิทธิ์) / tenants / contracts / documents / checklists / upload / rates
- [x] auth เต็ม — ทุก endpoint ต้องล็อกอิน, write = staff+, จัดการสิทธิ์ = admin
- [x] `UserOut` (ไม่มี password_hash) · secret ไป `.env`
- [ ] endpoint: audit_logs · เก็บ `created_by`/`uploaded_by` จาก current user (ตอนนี้ frontend ยังไม่ส่ง)
- [ ] response schema แยกสำหรับ tenants (`/tenants/` ยังคืน `national_id_encrypted`)
- [ ] ตาราง `rooms` + ผูก FK `contracts.room_id`
- [ ] เข้ารหัส `national_id_encrypted` จริง (ตอนนี้เป็นแค่ชื่อคอลัมน์)
- [ ] ContractForm submit ไม่มี transaction — ถ้า checklist/document พังหลังสร้าง contract แล้ว จะได้ข้อมูลไม่ครบ
- [ ] `/uploads/<file>` static ยังไม่ต้อง auth
- [ ] เขียน tests

**Frontend**
- [x] auth: Login page, AuthContext, RequireAuth, Bearer header, role-aware Sidebar/Topbar, หน้าจัดการสิทธิ์
- [x] ต่อ API จริง (`lib/api.js`), หน้า Tenants / Contracts / Rates (list + เพิ่ม/แก้/ลบ), ContractForm
- [ ] หน้า contract detail (ดู/แก้ checklist + เอกสารของสัญญา)
- [ ] dashboard (หน้าแรกยัง placeholder)
- [ ] state management (ตอนนี้ fetch ใน useEffect ต่อหน้า)

**Infra**
- [ ] frontend service ใน compose ยังไม่ได้อยู่ใน `eden-network` และยังไม่ได้ตั้ง URL ของ backend
- [ ] production Dockerfile (ตอนนี้ dev mode: `uvicorn --reload`, `npm run dev`)

---

## 10. Gotchas

- มี `main.py` 2 ที่: `backend-eden/main.py` (shim) กับ `backend-eden/app/main.py` (ตัวจริง) — รันด้วย `app.main:app`
- Alembic migration มีอันเดียว (init) และถูก regenerate ใหม่หลายรอบระหว่าง design — ถ้า DB มี schema เก่าให้ `DROP SCHEMA public CASCADE` แล้ว `alembic upgrade head` ใหม่ (dev เท่านั้น)
- `_enum_col()` ใน models.py จำเป็น — ถ้าใช้ `SAEnum(MyEnum)` ตรง ๆ Postgres จะเก็บ *ชื่อ member* (`check_in`) ไม่ใช่ *value* (`check-in`)
- repo ไม่มี `.gitattributes` → มี warning LF/CRLF เวลา `git add` บน Windows (ไม่กระทบอะไร)
