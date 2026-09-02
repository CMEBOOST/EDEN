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
│   │   ├── crud/*_crud.py     # user_crud, tenent_crud, contracts_crud, checklist_crud, document_crud, rate_crud, request_crud, dashboard_crud, audit_crud
│   │   ├── routers/routers.py # ทุก API endpoint (auth_router, router, tenant/contract/rate/... )
│   │   └── core/
│   │       ├── security.py    # hash_password / verify_password (bcrypt)
│   │       ├── auth.py        # JWT: create_access_token, get_current_user, require_roles/require_staff/require_admin
│   │       └── config.py      # SECRET_KEY ฯลฯ จาก .env
│   ├── alembic/versions/      # init → unique rate → contract_requests → b33c320591bb (users.avatar_url)
│   ├── alembic.ini · main.py (shim) · Dockerfile / .dockerignore
│   ├── create_admin.py        # seed admin คนแรก
│   ├── .env (gitignore) / .env.example
│   └── pyproject.toml / uv.lock / .python-version
│
├── frontend-eden/             # React + Vite — src/ จัดเป็น module-based
│   ├── src/
│   │   ├── App.jsx (routing + <RequireAuth>)  main.jsx  index.css
│   │   ├── lib/          # api.js (Bearer header, 401→logout, apiGet/Post/Put/Patch/Delete/Upload/Login), auth.js (token), datetime.js, avatar.js, queryClient.js (QueryClient + ล้าง cache ตอน auth:logout)
│   │   ├── data/         # ชั้น data (TanStack Query) ต่อ domain — keys.js (qk factory) + tenants/users/contracts/checklists/documents/rates/rooms/requests/dashboard/profile/audit.js (query hook + mutation hook + invalidate)
│   │   ├── auth/         # AuthContext.jsx (useAuth: user/login/logout), RequireAuth.jsx
│   │   ├── components/   # ConfirmDialog.jsx, FileDropField.jsx, AvatarPicker.jsx (พรีเซ็ต/อัปโหลด/ค่าเริ่มต้น)
│   │   ├── layout/       # Sidebar.jsx (เมนูตาม role), Topbar.jsx (breadcrumb + user dropdown), breadcrumbs.js (crumbsFor)
│   │   ├── pages/        # Login.jsx, About.jsx, Menu.jsx
│   │   └── modules/
│   │       ├── dashboard/ Dashboard.jsx (หน้า `/` — แตกตาม role: admin/staff KPI, tenant สัญญาตัวเอง)
│   │       ├── profile/   Profile.jsx (หน้า /profile — ทุก role: avatar + เปลี่ยนรหัสตัวเอง + ข้อมูลติดต่อ [เฉพาะผู้เช่า])
│   │       ├── users/     จัดการผู้ใช้ /users (admin) — Users.jsx, UserForm.jsx (เพิ่ม), UserEditModal.jsx (username+avatar), PasswordResetDialog.jsx
│   │       ├── audit/     AuditLog.jsx (/log — admin, filter user + ค้นหา + โหลดเพิ่ม)
│   │       ├── tenants/   Tenants.jsx (list — row คลิก→detail), TenantForm.jsx (เพิ่ม), TenantDetail.jsx (/tenants/:id),
│   │       │              TenantInfoSection.jsx (view/edit), TenantAccountSection.jsx, TenantContractsSection.jsx
│   │       ├── contracts/ Contracts.jsx (list+แก้/ลบ + <RequestPanel>), ContractForm.jsx (/contracts/new — 3 ส่วน),
│   │       │              ContractEditForm.jsx, ChecklistEditor.jsx (prop showCost), DocumentUploader.jsx
│   │       ├── requests/  คำแจ้งความจำนง — IntentNoticeDialog (tenant), RequestPanel/RenewDialog/RejectDialog (staff),
│   │       │              CheckoutInspection.jsx (หน้า /contracts/:id/checkout), requestMeta.js
│   │       └── rates/     Rates.jsx (list+CRUD ค่าน้ำ/ค่าไฟ), RateForm.jsx
│   ├── assets/           # รูป avatar ตั้งต้น: adminIcon.png / maleIcon.png / femaleIcon.png (นอก src/ แต่ใน Vite root — import ได้)
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
| `users` | user_id | username (uq), password_hash, role, is_active, avatar_url | — |
| `tenants` | tenant_id | full_name, phone, email, national_id_encrypted, last_login_at | user_id → users |
| `tenant_documents` | doc_id | doc_type, file_url | tenant_id → tenants, uploaded_by → users |
| `contracts` | contract_id | start/end_date, rent, security_deposit, status, room_id* | tenant_id → tenants, created_by → users |
| `contract_checklists` | cc_id | type (check-in/out), checklist_items (JSON), photo_urls (JSON), tenant_signature | contract_id → contracts, created_by → users |
| `contract_requests` | request_id | request_type (renew/terminate), status, tenant_note, preferred_date, staff_note, damage_total, handled_at | contract_id → contracts, created_by / handled_by → users |
| `rate_configs` | rate_id | type (water/electric), rate_value, effective_date · **UNIQUE(type, effective_date)** | created_by → users |
| `audit_logs` | log_id | action, created_at | user_id → users |

\* `room_id` ยังเป็น nullable ไม่มี FK — ตาราง `rooms` ยังไม่ทำ (Demo)

**Enums** (เก็บเป็น *value* ใน DB ผ่าน helper `_enum_col`):
- `role_enum`: admin / staff / tenant
- `contract_status_enum`: draft / active / expired / terminated
- `checklist_type_enum`: check-in / check-out
- `rate_type_enum`: water / electric
- `request_type_enum`: renew / terminate · `request_status_enum`: pending / accepted / rejected / completed

**ความสัมพันธ์หลัก:** `users` 1─N แทบทุกตาราง (ในฐานะผู้สร้าง/ผู้อัปโหลด),
`tenants` 1─N `tenant_documents` / `contracts`, `contracts` 1─N `contract_checklists` / `contract_requests`

---

## 5. API (ปัจจุบัน)

Base: `http://localhost:8000` · Swagger: `/docs`

| method | path | หมายเหตุ |
|---|---|---|
| GET | `/` | health check |
| POST | `/auth/login` | form (`username`,`password`) → `{access_token, token_type}` (JWT) |
| GET | `/auth/me` | ข้อมูล user ที่ล็อกอิน (`UserOut`) |
| GET | `/profile/` | `{user, tenant}` ของตัวเอง — tenant ส่งแค่ `has_national_id` (bool) ไม่ส่งค่าจริง |
| PATCH/POST | `/profile/avatar` | เปลี่ยนรูปตัวเอง — PATCH `{avatar_url}` (พรีเซ็ต/null) · POST multipart `file` (อัปโหลด, ไม่ผ่าน `/upload/`) |
| PATCH | `/profile/password` | เปลี่ยนรหัสตัวเอง `{current_password, new_password}` — รหัสเดิมผิด/ใหม่<6 → 400 |
| PATCH | `/profile/tenant` | ผู้เช่าแก้ข้อมูลติดต่อตัวเอง (`full_name/phone/email/current_address/emergency_contact`) — ไม่ผูก tenant → 404 · national_id แก้ไม่ได้ |
| POST/GET | `/users/` | สร้าง (admin) / list (staff+) — คืน `UserOut` (`user_id, username, role, is_active, avatar_url, created_at`) |
| GET/PATCH | `/users/{id}` | อ่าน (staff+) / แก้ (admin) `{username?, is_active?, avatar_url?}` — username ชน→409 · แก้ `is_active` ของตัวเองไม่ได้ (400) · `avatar_url` = null / "admin"/"male"/"female" / "/uploads/..." |
| PATCH | `/users/{id}/role` | เปลี่ยน role (admin) — เปลี่ยนของตัวเองไม่ได้ (400) · เปลี่ยนได้เฉพาะ admin ↔ staff (บัญชี tenant ล็อก role, 400) |
| PATCH | `/users/{id}/password` | admin ตั้งรหัสผ่านใหม่ให้โดยตรง (`{new_password}` ≥6 ตัว) |
| POST | `/upload/` | อัปโหลดไฟล์ 1 ไฟล์ (multipart `file`) → `{url, filename}` · จำกัด jpg/png/webp/gif/pdf ≤ 10MB |
| GET | `/uploads/<name>` | เสิร์ฟไฟล์ที่อัปโหลด (StaticFiles จาก `backend-eden/uploads/`) |
| POST/GET | `/tenants/` | สร้าง / list · create: user ต้อง role=tenant (400), ยังไม่ผูก tenant อื่น (409) |
| GET/PUT/DELETE | `/tenants/{id}` | อ่าน / แก้ (`TenantUpdate`) / ลบ |
| POST/GET | `/tenants/{id}/documents` | เอกสารของผู้เช่า (`{doc_type, file_url, uploaded_by?}`) |
| DELETE | `/documents/{doc_id}` | ลบเอกสาร |
| POST/GET | `/contracts/` | สร้าง (atomic: `+checkin_items, tenant_signature, documents` ในทรานแซกชันเดียว) / list (`tenant_id`, `finished`) · เช็ค tenant + วันที่ + ห้องว่าง (409) |
| POST | `/contracts/run-expire` | (admin) ตั้งสัญญา active ที่เลย end_date → expired · คืน `{expired: N}` |
| GET/PUT/DELETE | `/contracts/{id}` | อ่าน / แก้ (`ContractUpdate` — re-check วันที่) / ลบ |
| POST/GET | `/contracts/{id}/checklists` | บันทึกสภาพห้อง — `{type: check-in\|check-out, items:[{name,status,note,photos,cost}], tenant_signature?}` → เก็บ `checklist_items` (JSON) + `photo_urls` (flat) · `cost` = ค่าเสียหายรายรายการ (ใช้ตอน check-out) |
| POST/GET | `/contract-requests/` | คำแจ้งความจำนง — POST `{contract_id, request_type: renew\|terminate, tenant_note, preferred_date?}` (tenant = สัญญาตัวเอง, ซ้ำ→409) · GET tenant เห็นของตัวเอง / staff+ เห็นหมด (query `status`) |
| GET/PATCH/DELETE | `/contract-requests/{id}` | GET (tenant เจ้าของ/staff+) · PATCH (staff+) `{status, staff_note, preferred_date, damage_total}` — completed+terminate ต้องมี checklist check-out ก่อน (400) · DELETE = ยกเลิกคำแจ้ง (tenant ยกเลิกได้เฉพาะของตัวเองที่ status=pending / staff+ ลบได้ทุกอัน) |
| POST/GET | `/rates/` | อัตราค่าน้ำ/ค่าไฟ (`{type: water\|electric, rate_value, effective_date}`) · query `type` · POST ชน `(type, effective_date)` เดิม → **409** `{message, existing_rate_id}` |
| GET | `/rates/current` | อัตราที่มีผล ณ วันนี้ (หรือ `?date=`) → `{water: {...}\|null, electric: {...}\|null}` |
| GET/PUT/DELETE | `/rates/{rate_id}` | อ่าน / แก้ (`RateConfigUpdate`, PUT เข้า slot ที่มีแล้ว → 409) / ลบ |
| GET | `/audit-logs/` | **admin เท่านั้น** — query `skip`,`limit`,`user_id`,`q` (ค้นข้อความ action) |
| GET | `/dashboard/` | ข้อมูลแตกตาม role — admin: `counts`(+`requests_pending`)+`expiring`+`monthly_rent_total` · staff: ไม่มี rent_total · tenant: `{tenant, contract, documents, request, rates}` ของตัวเอง |

**Auth / RBAC** (ตาม Permission Matrix v1.0):
- ทุก endpoint (ยกเว้น `/auth/login`) ต้องมี `Authorization: Bearer <JWT>`
- **admin เท่านั้น**: `/users/*`, `/audit-logs/`, `/rates/` (create/update/delete), `DELETE /tenants|/contracts`, ยุติสัญญา (PUT contract `status=terminated`)
- **staff+**: `/tenants/*`, `/contracts/*` (ทั้ง router), `GET /rates/`, `PATCH /contract-requests/{id}` (รับเรื่อง/ปฏิเสธ/ปิดงาน), POST/PUT อื่น ๆ
- **tenant**: เข้าได้แค่ `/dashboard/`, `/auth/me`, `/profile/*` (แก้ของตัวเอง), `/rates/current`, `/contract-requests/` (POST + GET + DELETE เฉพาะของตัวเอง; ยกเลิกได้เฉพาะ status=pending) — เข้า `/tenants` `/contracts` `/rates` list → 403
- **ต่อสัญญา** = `PUT /contracts/{id}` `{end_date}` (staff+) · **ตรวจสภาพห้องออก** = `POST .../checklists` `{type:check-out}` (staff+) · ตั้ง `terminated` = admin เท่านั้น (staff ตรวจได้ แต่ยุติไม่ได้)
- `DELETE /tenants/{id}` = **soft delete** (ปิด `is_active` ของ user ที่ผูก, ข้อมูลไม่หาย)
- `/uploads/<file>` (static) ยังเปิดอ่านได้ไม่ต้อง token (dev)

**Audit log:** `AuditMiddleware` ([app/core/audit.py](backend-eden/app/core/audit.py)) บันทึกทุก request ที่ method เป็น POST/PUT/PATCH/DELETE + สำเร็จ (2xx) ลง `audit_logs` โดย decode token เอาว่าใครทำ + `describe()` แปลง method+path เป็นข้อความไทย · login บันทึกแยกใน route

> `/tenants/` ยังคืน `national_id_encrypted` (ยังไม่มี response schema แยก) · `created_by`/`uploaded_by`/`last_login_at` เซ็ตจาก current user แล้ว

---

## 6. วิธีรัน

### Docker (ทั้ง stack)
```bash
cp .env.example .env        # (ครั้งแรก) ปรับ port / password ได้ — ถ้าไม่มีก็ใช้ default
docker compose up -d --build
```
> พอร์ต/รหัสผ่านทั้งหมดปรับผ่าน `.env` ที่ root (ดู `.env.example`) · `SECRET_KEY` อยู่ `backend-eden/.env` แยกต่างหาก
> images pin เวอร์ชันแล้ว (`postgres:16.15`, `dpage/pgadmin4:9.17`, `uv:0.12.7`, `node:20.20-alpine`)
> `backend` มี healthcheck (`GET /`) · `frontend` รอ backend healthy ก่อนขึ้น
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
  - ใน Docker: compose ฉีดเข้าผ่าน `env_file: ./backend-eden/.env` (`required: false`) — ไม่ถูกฝังใน image (`.env` อยู่ใน `.dockerignore`)
- **สร้าง admin คนแรก:** `cd backend-eden && uv run python create_admin.py <user> <pass>` (มี `admin` / `admin123` อยู่แล้วสำหรับ dev)
- DB password / พอร์ต ปรับผ่าน `.env` ที่ root (`POSTGRES_PASSWORD`, `*_PORT` ฯลฯ) — มี default `admin123` สำหรับ dev
- data volume: **named volumes** `eden_postgres-data`, `eden_pgadmin-data` (Docker จัดการเอง)
  - อยู่รอด `docker compose down` — ลบเฉพาะ `docker compose down -v` หรือ `docker volume rm`
  - โฟลเดอร์ `postgres-data/` `pgadmin-data/` ที่ root เป็นของเก่า (สมัย bind mount) เลิกใช้แล้ว ลบทิ้งได้
- ไฟล์อัปโหลด: bind mount `./backend-eden/uploads:/app/uploads` (นอก image, เห็นบน host) — prod ควรเปลี่ยนเป็น named volume

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
- [x] endpoint: auth / users / tenants / contracts / documents / checklists / upload / rates / audit-logs
- [x] auth เต็ม — ทุก endpoint ต้องล็อกอิน, write = staff+, จัดการสิทธิ์ + audit = admin
- [x] `UserOut` (ไม่มี password_hash) · secret ไป `.env`
- [x] audit log — middleware บันทึกทุก write อัตโนมัติ
- [x] คำแจ้งความจำนง (UC3.8 ต่อสัญญา / ยุติสัญญา) — `contract_requests` + `/contract-requests/*` · ต่อ = ขยาย end_date · ยุติ = ตรวจห้องออก (`ChecklistItem.cost`) + คิดเงินคืน
- [x] เก็บ `created_by`/`uploaded_by`/`last_login_at` จาก current user (backend เซ็ตเอง ไม่รับจาก client)
- [x] DB constraint: `tenants.user_id` unique · 1 ห้อง–1 สัญญา active · CHECK วันที่/ค่าเงิน ≥ 0 · IntegrityError → 409
- [x] สร้างสัญญา atomic — `POST /contracts/` รับ checklist check-in + เอกสาร ในทรานแซกชันเดียว
- [x] `POST /contracts/run-expire` (admin) — ตั้ง active ที่เลย end_date เป็น expired (เอาไป cron)
- [x] response schema แยกสำหรับ tenants — `TenantSummary` (list, ไม่มี national_id/last_login_at/updated_at) · `TenantOut` (detail `GET/POST/PUT /tenants/{id}`, staff เห็น national_id ได้) · `/dashboard/` มุมมองผู้เช่าใช้ `_tenant_public`
- [ ] ตาราง `rooms` + ผูก FK `contracts.room_id`
- [ ] เข้ารหัส `national_id_encrypted` จริง (ตอนนี้เป็นแค่ชื่อคอลัมน์)
- [x] ContractForm submit เป็น 1 request atomic แล้ว (upload ไฟล์ยังแยก — orphan file ถ้าพัง)
- [ ] `/uploads/<file>` static ยังไม่ต้อง auth
- [ ] เขียน tests

**Frontend**
- [x] auth: Login page, AuthContext, RequireAuth, Bearer header, role-aware Sidebar/Topbar, จัดการสิทธิ์, Audit Log
- [x] Dashboard หน้า `/` แตกตาม role (admin KPI+รายได้, staff KPI, tenant สัญญา+เอกสารตัวเอง)
- [x] RBAC frontend — เมนู/route จำกัดตาม role, ซ่อนปุ่มลบ/ยุติสัญญาสำหรับ non-admin
- [x] ต่อ API จริง (`lib/api.js`), หน้า Tenants / Contracts / Rates (list + เพิ่ม/แก้/ลบ), ContractForm
- [x] คำแจ้งความจำนง — tenant กดจาก Dashboard · staff เห็น RequestPanel บน `/contracts` · หน้าตรวจห้องออก `/contracts/:id/checkout`
- [x] จัดการผู้ใช้ `/users` (เดิม `/permission` → redirect) — แก้ username, avatar (อัปโหลด/พรีเซ็ต), admin ตั้งรหัสผ่านใหม่, คอลัมน์ผู้เช่า
- [x] Profile `/profile` (เข้าจาก Topbar) — avatar + เปลี่ยนรหัสตัวเอง (UC6.2) + ผู้เช่าแก้ข้อมูลติดต่อตัวเอง (UC2.5, ยกเว้น national_id)
- [x] หน้า contract detail `/contracts/:id` (ContractDetail + InfoSection/ChecklistSection/Documents) + ประวัติสัญญา `/contracts/history`
- [x] หน้า tenant detail `/tenants/:id` (TenantDetail — ข้อมูลผู้เช่า ดู/แก้ + บัญชีผู้ใช้ + สัญญา + เอกสาร) · list row คลิก→detail เหมือน contracts
- [x] state management — TanStack Query v5 · `QueryClientProvider` ใน `main.jsx` · ชั้น hook ต่อ domain ใน `src/data/*` (query + mutation + invalidate) · key factory `src/data/keys.js` · `src/lib/queryClient.js` (staleTime 30s, ล้าง cache ตอน `auth:logout`) · ทุกหน้าเลิก fetch ใน useEffect — ใช้ `useXxx()` hook · mutation invalidate ด้วย prefix (`["contracts"]` ฯลฯ) แทน `tick`/prop-drill `onSaved`/`onActioned`

**Infra**
- [x] frontend service อยู่ใน `eden-network` + `container_name` + `depends_on: backend (healthy)`
- [x] `SECRET_KEY` ไม่ถูกฝังใน image · uploads อยู่นอก image · `npm ci` แทน `npm install`
- [x] pin image เวอร์ชันทุกตัว · healthcheck backend · root `.env` สำหรับ compose (port/password)
- [x] CI — `.github/workflows/ci.yml` (backend: pyright + alembic upgrade · frontend: eslint + vite build)
- [ ] ตั้ง `VITE_API_BASE` ตอน build (ตอนนี้ frontend เรียก `http://localhost:8000` ตายตัว)
- [ ] production Dockerfile (ตอนนี้ dev mode: `uvicorn --reload`, `npm run dev`) — frontend build → nginx, backend `--workers`, migration แยกเป็น one-shot
- [ ] backup Postgres (pg_dump cron) · แยก pgadmin เป็น compose profile

---

## 10. Gotchas

- มี `main.py` 2 ที่: `backend-eden/main.py` (shim) กับ `backend-eden/app/main.py` (ตัวจริง) — รันด้วย `app.main:app`
- Alembic migration มี 6 อัน (chain เดียว, head `d1c0nstra1nts`) · init downgrade drop enum type ให้แล้ว (`downgrade base && upgrade head` ได้)
- `_enum_col()` ใน models.py จำเป็น — ถ้าใช้ `SAEnum(MyEnum)` ตรง ๆ Postgres จะเก็บ *ชื่อ member* (`check_in`) ไม่ใช่ *value* (`check-in`)
- repo ไม่มี `.gitattributes` → มี warning LF/CRLF เวลา `git add` บน Windows (ไม่กระทบอะไร)
- `.gitignore` ซ่อน `.env*` ทั้งหมด ยกเว้น `**/.env.example` (negation) — ไฟล์ `.env` จริงไม่เคยเข้า git
