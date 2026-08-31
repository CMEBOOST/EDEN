# EDEN — โมดูลในระบบ (Module Overview)

สรุปว่าตอนนี้ระบบมีโมดูลอะไรบ้าง แต่ละโมดูล **ทำอะไรได้จริงแล้ว** และ **ยังขาดอะไร**
อัปเดต: 2026-08-31 · อ้างอิงจากโค้ดใน `backend-eden/` และ `frontend-eden/` ณ commit `063badc`

ภาพรวมอื่น ๆ ดูที่ [`context.md`](../context.md) (โครงโปรเจกต์ + วิธีรัน) และ [`database_erd.drawio`](database_erd.drawio) (ERD)

---

## สารบัญ

| # | โมดูล | Backend | Frontend | สิทธิ์หลัก |
|---|---|---|---|---|
| 1 | Auth (เข้าสู่ระบบ) | `/auth/*` | `pages/Login.jsx`, `auth/` | ทุกคน |
| 2 | Users (จัดการผู้ใช้) | `/users/*` | `modules/users/` | admin (list = staff+) |
| 3 | Profile (โปรไฟล์ตัวเอง) | `/profile/*` | `modules/profile/` | ทุก role |
| 4 | Tenants (ผู้เช่า) | `/tenants/*` | `modules/tenants/` | staff+ (ลบ = admin) |
| 5 | Documents (เอกสารผู้เช่า) | `/tenants/{id}/documents`, `/documents/*` | `modules/contracts/DocumentUploader.jsx` | staff+ |
| 6 | Contracts (สัญญาเช่า) | `/contracts/*` | `modules/contracts/` | staff+ (ลบ/ยุติ = admin) |
| 7 | Checklists (ตรวจสภาพห้อง) | `/contracts/{id}/checklists` (+ PATCH/DELETE `/{cc_id}`) | `ChecklistEditor.jsx`, `ChecklistSection.jsx`, `CheckoutInspection.jsx` | staff+ |
| 8 | Contract Requests (แจ้งความจำนง) | `/contract-requests/*` | `modules/requests/` | tenant แจ้ง / staff+ ดำเนินการ |
| 9 | Rates (อัตราค่าน้ำ-ไฟ) | `/rates/*` | `modules/rates/` | admin (list = staff+, current = ทุกคน) |
| 10 | Dashboard | `/dashboard/` | `modules/dashboard/` | ทุก role (ข้อมูลต่างกัน) |
| 11 | Audit Log | `/audit-logs/` | `modules/audit/` | admin |
| 12 | Uploads (ไฟล์) | `/upload/`, `/uploads/<name>` | `components/FileDropField.jsx` | staff+ (อ่าน = เปิด) |
| — | Core (auth/security/audit/storage/config) | `app/core/` | `lib/`, `auth/` | — |

> **Role:** `admin` = ผู้ดูแลระบบ · `staff` = เจ้าหน้าที่หอพัก · `tenant` = ผู้เช่า
> "staff+" = staff หรือ admin

---

## 1. Auth — เข้าสู่ระบบ / ยืนยันตัวตน

**Backend:** `app/routers/routers.py` (`auth_router`), `app/core/auth.py`, `app/core/security.py`, `app/core/config.py`
**Frontend:** `src/pages/Login.jsx`, `src/auth/AuthContext.jsx`, `src/auth/RequireAuth.jsx`, `src/lib/auth.js`, `src/lib/api.js`

ทำได้ตอนนี้:
- `POST /auth/login` — ล็อกอินด้วย username + password (form) → คืน JWT (`access_token`, `token_type`)
  - รหัสผิด → 401 · บัญชีถูกปิด (`is_active=false`) → 403 · สำเร็จ → เขียน audit log `"เข้าสู่ระบบ"`
- `GET /auth/me` — ข้อมูล user ที่ล็อกอิน (`UserOut`)
- JWT: HS256, อายุ default 480 นาที (`ACCESS_TOKEN_EXPIRE_MINUTES`), เซ็นด้วย `SECRET_KEY` จาก `.env`
- Password: bcrypt (rounds=12) + pre-hash SHA-256/base64 (รองรับรหัสยาว/unicode) — `hash_password` / `verify_password`
- Dependency ตรวจสิทธิ์: `get_current_user`, `require_staff` (admin+staff), `require_admin`
- Frontend: เก็บ token ใน `localStorage`, ใส่ `Authorization: Bearer` ทุก request, เจอ 401 → logout อัตโนมัติ, `<RequireAuth roles={[...]}>` กันเข้าหน้าตาม role

ยังไม่มี: refresh token, สมัครสมาชิกเอง (admin สร้างให้เท่านั้น), ลืมรหัสผ่าน (self-service), rate-limit การล็อกอิน

---

## 2. Users — จัดการผู้ใช้ (เดิมชื่อ "จัดการสิทธิ์")

**Backend:** `routers.py` (`router`, prefix `/users`), `app/crud/user_crud.py`
**Frontend:** `src/modules/users/` — `Users.jsx`, `UserForm.jsx`, `UserEditModal.jsx`, `PasswordResetDialog.jsx`

ทำได้ตอนนี้:
- `POST /users/` (admin) — สร้างผู้ใช้ใหม่ (username, password, role) · username ซ้ำ → 409
- `GET /users/` (staff+) — รายชื่อผู้ใช้ทั้งหมด (`UserOut`: user_id, username, role, is_active, avatar_url, created_at) — **ไม่มี** password_hash
- `GET /users/{id}` (staff+) — ดูรายคน
- `PATCH /users/{id}` (admin) — แก้ `username` / `is_active` / `avatar_url` · username ชน → 409 · ปิดบัญชีตัวเองไม่ได้ → 400
- `PATCH /users/{id}/role` (admin) — เปลี่ยน role · เปลี่ยนของตัวเองไม่ได้ → 400
- `PATCH /users/{id}/password` (admin) — ตั้งรหัสผ่านใหม่ให้ผู้ใช้โดยตรง (≥ 6 ตัว)
- Frontend: หน้า `/users` (admin) — ตารางผู้ใช้ + คอลัมน์ผู้เช่าที่ผูก, เพิ่มผู้ใช้, แก้ username/avatar (พรีเซ็ต admin/male/female หรืออัปโหลด), รีเซ็ตรหัสผ่าน · `/permission` redirect มา `/users`

ยังไม่มี: ลบผู้ใช้ถาวร (ใช้ปิด `is_active` แทน), bulk action, ค้นหา/กรองในตาราง

---

## 3. Profile — โปรไฟล์ของตัวเอง (ทุก role)

**Backend:** `routers.py` (`profile_router`, prefix `/profile`)
**Frontend:** `src/modules/profile/Profile.jsx` (เข้าจาก Topbar), `src/components/AvatarPicker.jsx`, `src/lib/avatar.js`

ทำได้ตอนนี้:
- `GET /profile/` — คืน `{user, tenant}` ของตัวเอง · ถ้าเป็นผู้เช่าจะแนบข้อมูลติดต่อ แต่บัตร ปชช. ส่งแค่ `has_national_id` (bool) ไม่ส่งค่าจริง
- `PATCH /profile/avatar` — ตั้ง avatar เป็นพรีเซ็ต (`admin`/`male`/`female`) หรือ `null`
- `POST /profile/avatar` — อัปโหลดรูป avatar เอง (multipart, ไม่ผ่าน `/upload/`)
- `PATCH /profile/password` — เปลี่ยนรหัสผ่านตัวเอง (`current_password` + `new_password`) · รหัสเดิมผิด / ใหม่ < 6 → 400
- `PATCH /profile/tenant` — ผู้เช่าแก้ข้อมูลติดต่อตัวเอง (`full_name`, `phone`, `email`, `current_address`, `emergency_contact`) · แก้ `national_id` ไม่ได้ (กันไว้ในรายการ `_SENSITIVE_TENANT`) · บัญชีไม่ผูกผู้เช่า → 404
- Frontend: หน้า `/profile` — เปลี่ยน avatar, เปลี่ยนรหัสผ่าน, และ (เฉพาะผู้เช่า) แก้ข้อมูลติดต่อ

---

## 4. Tenants — ผู้เช่า

**Backend:** `routers.py` (`tenant_router`), `app/crud/tenent_crud.py`
**Frontend:** `src/modules/tenants/` — `Tenants.jsx`, `TenantForm.jsx`

ทำได้ตอนนี้:
- `POST /tenants/` (staff+) — สร้างผู้เช่า ผูกกับ `user_id` · user ต้อง role=`tenant` (ไม่ใช่ → 400) · ผูกซ้ำ → 409
- `GET /tenants/` (staff+) — รายชื่อผู้เช่า
- `GET /tenants/{id}` (staff+) — รายคน
- `PUT /tenants/{id}` (staff+) — แก้ข้อมูล (`TenantUpdate`)
- `DELETE /tenants/{id}` (admin) — **soft delete**: ปิด `is_active` ของ user ที่ผูก (ข้อมูลผู้เช่าไม่หาย)
- Frontend: หน้า `/tenants` (staff+) — ตาราง + เพิ่ม/แก้/ลบ, ฟอร์มผู้เช่า

ยังไม่มี / หมายเหตุ:
- `national_id_encrypted` ยังเก็บ plaintext (ยังไม่เข้ารหัสจริง) และ `GET /tenants/` ยังคืนค่านี้ออกมา (ยังไม่มี response schema แยก)
- `last_login_at` มีคอลัมน์แต่ยังไม่มีการอัปเดต

---

## 5. Documents — เอกสารของผู้เช่า

**Backend:** `routers.py` (`tenant_router` + `document_router`), `app/crud/document_crud.py`
**Frontend:** `src/modules/contracts/DocumentUploader.jsx` (ใช้ระหว่างสร้างสัญญา), `src/modules/contracts/ContractDocuments.jsx` (ในหน้า contract detail)

ทำได้ตอนนี้:
- `POST /tenants/{id}/documents` (staff+) — เพิ่มเอกสาร (`doc_type`, `file_url`, `uploaded_by?`)
- `GET /tenants/{id}/documents` (staff+) — รายการเอกสารของผู้เช่า
- `DELETE /documents/{doc_id}` (staff+) — ลบเอกสาร

ยังไม่มี: `uploaded_by` ยังไม่ set จาก current user (frontend ยังไม่ส่ง) · จัดการเอกสารได้จากฟอร์มสร้างสัญญา + หน้า contract detail (ยังไม่มีหน้าเอกสารระดับผู้เช่าแยกเดี่ยว ๆ)

---

## 6. Contracts — สัญญาเช่า

**Backend:** `routers.py` (`contract_router`), `app/crud/contracts_crud.py`
**Frontend:** `src/modules/contracts/` — `Contracts.jsx`, `ContractForm.jsx` (`/contracts/new`), `ContractHistory.jsx` (`/contracts/history`), `ContractDetail.jsx` (`/contracts/:id` และ `/contracts/history/:id` แบบ `readOnly`) + `ContractInfoSection.jsx` / `ChecklistSection.jsx` / `ContractDocuments.jsx` (ทั้ง 3 รับ prop `readOnly`)

ทำได้ตอนนี้:
- `POST /contracts/` (staff+) — สร้างสัญญา · เช็ค `tenant_id` มีจริง, `created_by` (ถ้าส่ง) มีจริง, `end_date` ≥ `start_date` · สถานะเริ่มต้น = `draft`
- `GET /contracts/` (staff+) — รายการ · กรองด้วย `?tenant_id=` · `?finished=true|false` (true = มี checklist `check-out` แล้ว, false = ยังไม่มี, ไม่ส่ง = ทั้งหมด)
- `GET /contracts/{id}` (staff+) — รายสัญญา
- `PUT /contracts/{id}` (staff+) — แก้ (`ContractUpdate`)
  - **ต่อสัญญา** = แก้ `end_date`
  - ตั้ง `status=terminated` (**ยุติสัญญา**) = **admin เท่านั้น** (staff → 403)
- `DELETE /contracts/{id}` (admin) — ลบสัญญา (hard delete)
- ฟิลด์: `start/end_date`, `rent`, `security_deposit`, `contract_file_url`, `special_conditions`, `status`, `room_id`
- Frontend:
  - หน้า `/contracts` (staff+) — ตาราง **เฉพาะสัญญาที่ยังไม่เสร็จสิ้น** (`?finished=false`) · คลิกแถว / ปุ่ม "รายละเอียด" ไปหน้า detail · ลบ (admin) · `<RequestPanel>` · ปุ่ม "ประวัติสัญญาเช่า" (ข้างปุ่มเพิ่มสัญญา) → `/contracts/history`
  - หน้า `/contracts/history` (`ContractHistory`, staff+) — ตารางสัญญาที่ **เสร็จสิ้นแล้ว** (มี checklist `check-out`, `?finished=true`) · คลิกแถว → `/contracts/history/:id`
  - หน้า `/contracts/new` ฟอร์ม 3 ส่วน (ข้อมูลสัญญา + checklist check-in + เอกสาร)
  - หน้า `/contracts/:id` (`ContractDetail`) — ดู/แก้ข้อมูลสัญญา (inline, PUT) + จัดการ checklist ทุกใบ (เพิ่ม/แก้/ลบ) + เอกสารของผู้เช่า (เพิ่ม/ลบ) · การแก้สัญญาย้ายมาที่นี่ทั้งหมด (เดิม modal `ContractEditForm` — ลบทิ้งแล้ว)
  - หน้า `/contracts/history/:id` (`ContractDetail` prop `readOnly`) — เหมือน detail แต่ดูอย่างเดียว (ซ่อนปุ่มแก้/เพิ่ม/ลบ/ลบสัญญา/ตรวจห้องออก) · ปุ่ม "← กลับ" ไป `/contracts/history` · เก็บเป็นประวัติ

ยังไม่มี / หมายเหตุ:
- ตาราง `rooms` ยังไม่มี — `room_id` เป็น nullable ไม่มี FK
- ฟอร์มสร้างสัญญาไม่มี transaction — ถ้า checklist/เอกสารพังหลังสร้างสัญญาแล้ว จะได้ข้อมูลไม่ครบ
- `created_by` ยัง `null` (frontend ยังไม่ส่ง current user)
- เอกสารในหน้า detail เป็นเอกสารระดับ **ผู้เช่า** (ใช้ร่วมทุกสัญญาของผู้เช่ารายนั้น) — ยังไม่ผูก `contract_id`
- `expired` ต้องตั้งเอง — ยังไม่มี job อัปเดตสถานะตามวันหมดอายุ
- "เสร็จสิ้น" ดูจาก **มี checklist `check-out`** ไม่ได้ดู `status` — สัญญาที่ admin ตั้ง `terminated` แต่ยังไม่ได้ตรวจคืนห้อง จะยังอยู่หน้า `/contracts` · พอเข้าประวัติแล้วแก้ไม่ได้ (ต้องผ่าน DB/API)

---

## 7. Checklists — ตรวจสภาพห้อง (check-in / check-out)

**Backend:** `routers.py` (`contract_router` — `/contracts/{id}/checklists`), `app/crud/checklist_crud.py`
**Frontend:** `src/modules/contracts/ChecklistEditor.jsx` (prop `showCost`), `src/modules/contracts/ChecklistSection.jsx` (ในหน้า detail), `src/modules/requests/CheckoutInspection.jsx` (หน้า `/contracts/:id/checkout`)

ทำได้ตอนนี้:
- `POST /contracts/{id}/checklists` (staff+) — บันทึกสภาพห้อง
  - `type`: `check-in` | `check-out`
  - `items`: `[{name, status, note, photos, cost}]` — เก็บเป็น JSON ใน `checklist_items`
  - `photo_urls`: รวมรูปทุกรายการเป็น list เดียว (flat)
  - `cost` = ค่าเสียหายรายรายการ (ใช้ตอน check-out เพื่อคำนวณเงินคืน)
  - `tenant_signature` (ลายเซ็นผู้เช่า, optional)
- `GET /contracts/{id}/checklists` (staff+) — รายการ checklist ของสัญญา
- `PATCH /contracts/{id}/checklists/{cc_id}` (staff+) — แก้ `type` / `items` / `tenant_signature` (ส่งเฉพาะ field ที่แก้) · แก้ `items` แล้ว `photo_urls` คำนวณใหม่ · ไม่พบ/ไม่ใช่ของสัญญานั้น → 404
- `DELETE /contracts/{id}/checklists/{cc_id}` (staff+) — ลบ checklist หนึ่งใบ · ไม่พบ → 404
- Frontend: `ChecklistEditor` ใช้ทั้งตอนสร้างสัญญา (check-in), หน้า `/contracts/:id/checkout` (check-out, โชว์ช่องกรอกค่าเสียหาย) และ `ChecklistSection` ในหน้า detail (ดู/เพิ่ม/แก้/ลบ ทุกใบ)

---

## 8. Contract Requests — คำแจ้งความจำนงล่วงหน้า (ต่อสัญญา / ยุติสัญญา)

**Backend:** `routers.py` (`request_router`, prefix `/contract-requests`), `app/crud/request_crud.py`
**Frontend:** `src/modules/requests/` — `IntentNoticeDialog.jsx` (ผู้เช่า), `RequestPanel.jsx` / `RenewDialog.jsx` / `RejectDialog.jsx` (staff), `CheckoutInspection.jsx`, `requestMeta.js`

ทำได้ตอนนี้:
- `POST /contract-requests/` — แจ้งความจำนง (`contract_id`, `request_type`: `renew`|`terminate`, `tenant_note`, `preferred_date?`)
  - ผู้เช่าแจ้งได้เฉพาะสัญญาของตัวเอง (ไม่ใช่ → 403)
  - มีคำขอที่ค้างอยู่แล้วสำหรับสัญญานั้น → 409
- `GET /contract-requests/` — ผู้เช่าเห็นเฉพาะของตัวเอง · staff+ เห็นทั้งหมด (กรอง `?status=`)
- `GET /contract-requests/{id}` — ผู้เช่าเจ้าของ หรือ staff+
- `PATCH /contract-requests/{id}` (staff+) — ดำเนินการ: `status`, `staff_note`, `preferred_date`, `damage_total`
  - ปิดงาน (`completed`) ของคำขอ `terminate` → ต้องมี checklist `check-out` ของสัญญานั้นก่อน (ไม่มี → 400)
  - บันทึกผู้ดำเนินการ (`handled_by`) + เวลา (`handled_at`)
- `DELETE /contract-requests/{id}` — ยกเลิกคำขอ
  - ผู้เช่า: ยกเลิกได้เฉพาะของตัวเองที่ `status=pending` เท่านั้น
  - staff+: ลบได้ทุกอัน
- สถานะ: `pending` → `accepted` / `rejected` / `completed`
- Frontend: ผู้เช่ากดแจ้งจาก Dashboard · staff เห็น `RequestPanel` บนหน้า `/contracts` (รับเรื่อง / ต่อสัญญา / ปฏิเสธ) · ยุติสัญญาไปที่หน้าตรวจห้องออก `/contracts/:id/checkout`

หมายเหตุ: การ "ต่อสัญญา" จริง ๆ (ขยาย `end_date`) และ "ยุติ" (ตั้ง `terminated`) ยังเป็นการกระทำแยกบน `/contracts/{id}` — request เป็นตัวติดตามคำขอ ไม่ได้แก้สัญญาให้อัตโนมัติ

---

## 9. Rates — อัตราค่าน้ำ / ค่าไฟ

**Backend:** `routers.py` (`rate_router`), `app/crud/rate_crud.py`
**Frontend:** `src/modules/rates/` — `Rates.jsx`, `RateForm.jsx`

ทำได้ตอนนี้:
- `POST /rates/` (admin) — เพิ่มอัตรา (`type`: `water`|`electric`, `rate_value`, `effective_date`)
  - ชน `(type, effective_date)` เดิม → **409** `{message, existing_rate_id}` (มี `UNIQUE` constraint)
- `GET /rates/` (staff+) — รายการทั้งหมด (กรอง `?type=`)
- `GET /rates/current` (ทุก role ที่ล็อกอิน) — อัตราที่มีผล ณ วันนี้ หรือ `?date=` → `{water: {...}|null, electric: {...}|null}`
- `GET /rates/{id}` — รายการเดียว
- `PUT /rates/{id}` (admin) — แก้ · ย้ายเข้า slot `(type, effective_date)` ที่มีแล้ว → 409
- `DELETE /rates/{id}` (admin) — ลบ
- โมเดล = **effective-dated history**: แต่ละแถว = "ตั้งแต่วันนี้ เรทคือ X" · อัตราปัจจุบัน = `effective_date` ล่าสุดที่ ≤ วันนี้ (`get_effective_rate`)
- Frontend: หน้า `/rate` (**admin เท่านั้น** ใน UI แม้ backend `GET` จะเปิดถึง staff) — ตาราง + เพิ่ม/แก้/ลบ

ยังไม่มี: การนำเรทไปคำนวณบิลค่าน้ำ-ไฟจริง (ยังไม่มีโมดูลมิเตอร์/ใบแจ้งหนี้)

---

## 10. Dashboard — หน้าแรก (แตกตาม role)

**Backend:** `routers.py` (`dashboard_router`), `app/crud/dashboard_crud.py`
**Frontend:** `src/modules/dashboard/Dashboard.jsx` (route `/`)

ทำได้ตอนนี้ — `GET /dashboard/` คืนข้อมูลต่างกันตาม role:
- **admin:** `counts` (ผู้เช่า/สัญญา/ฯลฯ + `requests_pending`) + `expiring` (สัญญาใกล้หมดใน 30 วัน) + `monthly_rent_total` (ยอดค่าเช่ารวมต่อเดือน)
- **staff:** เหมือน admin แต่ **ไม่มี** `monthly_rent_total`
- **tenant:** `{tenant, contract, documents, request, rates}` ของตัวเอง — สัญญาปัจจุบัน, เอกสารของตัวเอง, คำแจ้งความจำนงล่าสุด, อัตราค่าน้ำ-ไฟปัจจุบัน
- Frontend: การ์ด KPI สำหรับ admin/staff · ผู้เช่าเห็นสัญญา + เอกสาร + ปุ่มแจ้งความจำนง (`IntentNoticeDialog`)

---

## 11. Audit Log — บันทึกการใช้งาน

**Backend:** `app/core/audit.py` (`AuditMiddleware`), `routers.py` (`audit_router`), `app/crud/audit_crud.py`
**Frontend:** `src/modules/audit/AuditLog.jsx` (route `/log`, admin)

ทำได้ตอนนี้:
- `AuditMiddleware` บันทึกทุก request ที่เป็น `POST/PUT/PATCH/DELETE` **และสำเร็จ (2xx)** ลงตาราง `audit_logs`
  - decode JWT เอา username → หา user_id
  - `describe(method, path)` แปลงเป็นข้อความไทย เช่น `"แก้ไขสัญญา #5"`, `"เปลี่ยนรูปโปรไฟล์"`, `"แจ้งความจำนง (ต่อ/ยุติสัญญา)"`
  - login บันทึกแยกใน route (`"เข้าสู่ระบบ"`)
- `GET /audit-logs/` (**admin เท่านั้น**) — query `skip`, `limit`, `user_id`, `q` (ค้นข้อความ action)
- Frontend: หน้า `/log` — ตาราง + กรองตามผู้ใช้ + ช่องค้นหา + ปุ่มโหลดเพิ่ม

หมายเหตุ: `audit_logs` มีแค่ `created_at` (ไม่มี `updated_at`) · เก็บแค่ข้อความ ไม่เก็บ payload/diff

---

## 12. Uploads — ไฟล์แนบ

**Backend:** `app/core/storage.py`, `routers.py` (`upload_router`), static mount ใน `app/main.py`
**Frontend:** `src/components/FileDropField.jsx`, `src/lib/api.js` (`apiUpload`)

ทำได้ตอนนี้:
- `POST /upload/` (staff+) — อัปโหลดไฟล์ 1 ไฟล์ (multipart `file`) → `{url, filename}`
  - รองรับ `.jpg .jpeg .png .webp .gif .pdf` · ≤ 10 MB · ตั้งชื่อใหม่เป็น UUID
- `GET /uploads/<name>` — เสิร์ฟไฟล์จาก `backend-eden/uploads/` (StaticFiles)
- เก็บบนดิสก์ผ่าน bind mount `./backend-eden/uploads` (เห็นบน host)

ยังไม่มี / หมายเหตุ: `/uploads/<file>` static ยัง**เปิดอ่านได้โดยไม่ต้อง token** (dev) · ยังไม่มีการลบไฟล์กำพร้า · prod ควรย้ายไป object storage / named volume

---

## Core (โครงสร้างพื้นฐาน — ไม่ใช่ฟีเจอร์ผู้ใช้)

### Backend `app/core/`
| ไฟล์ | หน้าที่ |
|---|---|
| `config.py` | โหลด `.env` (`backend-eden/.env`), ให้ `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` |
| `security.py` | `hash_password` / `verify_password` (bcrypt + SHA-256 pre-hash) |
| `auth.py` | สร้าง/ตรวจ JWT, `get_current_user`, `require_roles` / `require_staff` / `require_admin`, `username_from_token` |
| `audit.py` | `AuditMiddleware` + `describe()` (method+path → ข้อความไทย) |
| `errors.py` | `ErrorHandlerMiddleware` — จับ exception ที่ไม่ได้ handle → ตอบ JSON 500 (มี header CORS) แทน error ดิบที่ทำให้ frontend เห็น "Failed to fetch" |
| `storage.py` | `save_upload()` — ตรวจนามสกุล/ขนาด, เซฟลง `uploads/` |

> **ลำดับ middleware ใน `app/main.py`** (นอก→ใน): `CORSMiddleware` → `ErrorHandlerMiddleware` → `AuditMiddleware` → router · CORS ต้อง add ทีหลังสุด (ชั้นนอกสุด) เพื่อให้ response ที่เป็น error ได้ header CORS ครบ

### Backend อื่น ๆ
- `app/database.py` — engine / `SessionLocal` / `get_db` / `Base` (อ่าน `DATABASE_URL`)
- `app/models/models.py` — ORM models ทั้งหมด (source of truth ของ schema) + enums + `TimestampMixin` + `_enum_col`
- `app/schemas/schemas.py` — Pydantic schemas (request/response)
- `app/crud/*` — logic เข้าถึง DB แยกตาม entity
- `alembic/versions/` — migration: init → unique rate → contract_requests → `b33c320591bb` (`users.avatar_url`)
- `create_admin.py` — seed admin คนแรก

### Frontend `src/lib/` + `src/auth/` + `src/layout/` + `src/components/`
| ไฟล์ | หน้าที่ |
|---|---|
| `lib/api.js` | `apiGet/Post/Put/Patch/Delete/Upload/Login` — ใส่ Bearer header, เจอ 401 → logout |
| `lib/auth.js` | จัดการ token ใน localStorage |
| `lib/datetime.js` | จัดรูปแบบเวลา (timezone Asia/Bangkok) |
| `lib/avatar.js` | `avatarSrc()` + พรีเซ็ต avatar |
| `auth/AuthContext.jsx` | `useAuth()` — `user` / `login` / `logout` |
| `auth/RequireAuth.jsx` | กัน route ตามสถานะล็อกอิน + role |
| `layout/Sidebar.jsx` | เมนูข้าง — แสดงตาม role (staff เห็นผู้เช่า/สัญญา · admin เห็นเพิ่ม อัตราค่าบริการ/จัดการผู้ใช้/Audit Log) |
| `layout/Topbar.jsx` | avatar + ชื่อ + role + ปุ่ม logout + ลิงก์ไป `/profile` |
| `components/ConfirmDialog.jsx` | กล่องยืนยันการทำงาน |
| `components/FileDropField.jsx` | ลากวางไฟล์เพื่ออัปโหลด |
| `components/AvatarPicker.jsx` | เลือกพรีเซ็ต / อัปโหลด / ค่าเริ่มต้น avatar |
| `pages/Login.jsx` | หน้าเข้าสู่ระบบ |
| `pages/About.jsx`, `pages/Menu.jsx` | หน้าคงที่ / เมนูรวม |

---

## สรุปสิ่งที่ยังไม่มี (ข้ามโมดูล)

- **Rooms** — ยังไม่มีตาราง/โมดูลห้องพัก (`contracts.room_id` ลอยอยู่)
- **บิล / ใบแจ้งหนี้ / มิเตอร์น้ำ-ไฟ** — มีแค่ "อัตรา" ยังไม่มีการออกบิล
- **การเข้ารหัสบัตรประชาชนจริง** — `national_id_encrypted` ยัง plaintext
- **`created_by` / `uploaded_by`** — ยังไม่ถูกบันทึกจาก current user
- **สถานะสัญญาอัตโนมัติ** — ไม่มี job ตั้ง `expired` ตามวันหมดอายุ
- **Tests** — ยังไม่มี unit/integration test
- **State management ฝั่ง frontend** — ยัง fetch ใน `useEffect` ต่อหน้า
- **Production build** — ยังเป็น dev mode (`uvicorn --reload`, `npm run dev`), `VITE_API_BASE` ยัง hardcode `http://localhost:8000`
