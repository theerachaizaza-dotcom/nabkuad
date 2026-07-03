# NabKuad (นับขวด) — Architecture & Build Spec

Standalone backend + admin dashboard สำหรับแอปนับสต็อกเครื่องดื่ม
แยกเป็นเอกเทศ ไม่เชื่อมกับ core system เดิม

> เอกสารนี้ให้ Claude Code อ่านเป็น context ก่อนเริ่มเขียนโค้ด
> หัวใจของระบบ = การแปลง **เศษ ML → Total Net Bottles** ให้ lock data model ตรงนี้ก่อน

---

## 1. Tech Stack

- **Next.js 15 (App Router) + React 19 + TypeScript** — แอดมิน dashboard + API layer ในตัวเดียว
- **Tailwind v4** — UI
- **Supabase (Postgres)** — database + auth
- **zod** — validate payload ที่ API
- **SheetJS (xlsx)** — export .xlsx / .csv
- Deploy: **Vercel** (single app)

> ทำเป็น **แอปเดียว** ไม่ต้องแยก repo backend/frontend
> `/app/api/*` = API ให้ mobile ยิงเข้า, `/app/(admin)/*` = dashboard
> วิธีนี้ deploy บน Vercel ง่ายสุดและเลี่ยงปัญหา repo/Vercel misconfig

---

## 2. Folder Structure

```
nabkuad/
├── src/
│   ├── app/
│   │   ├── (admin)/                    # Admin dashboard (ต้อง login เป็น admin)
│   │   │   ├── layout.tsx              # sidebar + auth guard
│   │   │   ├── dashboard/page.tsx      # Monitoring: สถานะ submit ต่อ location
│   │   │   ├── products/page.tsx       # Master data CRUD (สินค้า + capacity)
│   │   │   ├── categories/page.tsx     # CRUD หมวดหมู่
│   │   │   ├── locations/page.tsx      # CRUD จุดนับ
│   │   │   ├── sessions/
│   │   │   │   ├── page.tsx            # list รอบนับ
│   │   │   │   └── [id]/page.tsx       # รายละเอียด 1 รอบ + ปุ่ม export
│   │   │   └── export/page.tsx         # export center (เลือกรอบ → .xlsx/.csv)
│   │   │
│   │   ├── api/v1/                     # ===== API สำหรับ Mobile App =====
│   │   │   ├── bootstrap/route.ts      # GET  master data ก้อนเดียว (cache ที่แอป)
│   │   │   ├── sessions/
│   │   │   │   ├── current/route.ts    # GET  รอบที่ status=open
│   │   │   │   └── [id]/
│   │   │   │       ├── lines/route.ts  # GET  ดึง draft เดิมของ location (resume)
│   │   │   │       ├── counts/route.ts # POST upsert ยอดนับของ location (save)
│   │   │   │       └── submit/route.ts # POST ปิดยอด location = submitted
│   │   │   └── export/route.ts         # GET  ?session_id= → ไฟล์ xlsx/csv
│   │   │
│   │   ├── login/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                         # ปุ่ม, table, modal ฯลฯ
│   │   ├── dashboard/                  # StatusGrid, SubmissionBadge
│   │   └── forms/                      # ProductForm, CategoryForm
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # browser client
│   │   │   ├── server.ts               # server client (RLS ตาม user)
│   │   │   └── admin.ts                # service-role client (ข้าม RLS ใช้ใน API เท่านั้น)
│   │   ├── validation/                 # zod schemas (count payload ฯลฯ)
│   │   ├── calc/net-bottles.ts         # logic แปลง ML → net (มี unit test)
│   │   └── export/build-sheet.ts       # สร้าง xlsx/csv
│   │
│   ├── types/                          # types ที่ gen จาก Supabase + shared
│   └── middleware.ts                   # auth guard สำหรับ (admin)
│
├── supabase/
│   ├── migrations/0001_init.sql
│   └── seed.sql
│
├── .env.local.example
├── package.json
└── ARCHITECTURE.md
```

---

## 3. Data Model (สรุป)

| ตาราง | หน้าที่ |
|---|---|
| `profiles` | ต่อจาก auth.users — role (admin/staff) + ผูก location |
| `categories` | หมวดหมู่เครื่องดื่ม |
| `products` | รายการสินค้า + `capacity_ml` + `count_mode` + `price_per_unit` (บาท) + `sku` |
| `locations` | Main / Service / Terrace / Rooftop Bar, Store on Boat |
| `count_sessions` | 1 รอบนับ = 1 record (open/closed) |
| `location_submissions` | สถานะ submit ต่อ location ต่อรอบ (pending/submitted) |
| `count_lines` | raw data ต่อ product ต่อ location + `net_bottles` |

รายละเอียดเต็ม → `supabase/migrations/0001_init.sql`

---

## 4. Net Bottles Logic (หัวใจ)

```
net_bottles = full_bottles + (leftover_ml / capacity_ml_snapshot)
```

ตัวอย่าง: ขวด 700ml, นับได้ 5 ขวดเต็ม + เศษ 300ml
→ `5 + (300 / 700)` = **5.4286** net bottles

**กฎเหล็ก 2 ข้อ:**

1. **snapshot capacity** — ตอน mobile ยิง count line เข้ามา ต้องก็อป `products.capacity_ml`
   ปัจจุบันมาเก็บใน `count_lines.capacity_ml_snapshot` เสมอ
   → ถ้า admin แก้ capacity สินค้าทีหลัง ยอดรอบเก่า **จะไม่เพี้ยน**
2. `net_bottles` เป็น **generated column** — DB คำนวณให้เอง ไม่ต้องคำนวณซ้ำที่ client
   (แต่ยังควรมี `lib/calc/net-bottles.ts` + unit test ไว้ให้ mobile โชว์ preview)

**Validation ที่ API (zod):** `full_bottles >= 0`, `leftover_ml >= 0` (ไม่จำกัดเพดานบน)

**Overflow / การทบเศษ (สำคัญ):** เศษ ML รวมของขวดที่เปิดอาจ **เกิน 1 ขวด** ได้จริง
เช่น Belvedere 700ml: 5 ขวดเต็ม + เศษรวม 898ml ต้องกรอกได้ ห้ามบล็อก
ตอน API บันทึก ให้ **normalize** ทบส่วนเกินเป็นขวดเต็มอัตโนมัติ:
```
extra   = floor(leftover_ml / capacity_ml)   # 898 / 700 = 1
full   += extra                               # 5 -> 6
leftover_ml = leftover_ml % capacity_ml       # 898 -> 198
```
net เท่าเดิมทุกกรณี (`5 + 898/700` = `6 + 198/700` = 6.283) แต่ข้อมูลใน DB สะอาด
(leftover < capacity เสมอ) และตรงกับที่สตาฟตีมือ

**count_mode — สินค้ามี 2 แบบการนับ:**
- `fractional` (เหล้า/ไวน์/แชมเปญ/ไซรัป Monin/bitters) → mobile โชว์ทั้งช่อง ขวดเต็ม + เศษ ML
- `unit` (เบียร์/น้ำ/น้ำอัดลม/ชา/น้ำผลไม้กล่อง/ซิการ์) → mobile **ซ่อนช่อง ML**, `leftover_ml = 0` เสมอ

สูตรเดียวใช้ได้ทั้งคู่: unit item มี leftover = 0 → `net_bottles = full_bottles` พอดี
ไม่ต้อง branch ใน DB (generated column เหมือนเดิม) count_mode แค่คุม UI + validation ฝั่ง mobile

---

## 5. API Contract (Mobile)

ทุก request แนบ Supabase JWT (`Authorization: Bearer <token>`)

**GET `/api/v1/bootstrap`** — โหลด master data ก้อนเดียว
```json
{
  "categories": [{ "id": "...", "name": "Spirits", "sort_order": 1 }],
  "products":   [{ "id": "...", "name": "Absolut Vodka 700ml",
                   "category_id": "...", "capacity_ml": 700, "sku": "SP-ABS-700" }],
  "locations":  [{ "id": "...", "name": "Main Bar", "code": "MAIN" }]
}
```

**GET `/api/v1/sessions/current`** → รอบที่ `status=open` (ถ้าไม่มี = null)

**GET `/api/v1/sessions/{id}/lines?location_id=...`** → draft เดิมของ location นั้น (resume การนับ)

**POST `/api/v1/sessions/{id}/counts`** — save/upsert ยอดของ location
```json
{
  "location_id": "uuid",
  "lines": [
    { "product_id": "uuid", "full_bottles": 5, "leftover_ml": 300 }
  ]
}
```
> Backend ดึง `capacity_ml` ปัจจุบันจาก products มาใส่ `capacity_ml_snapshot`
> แล้ว upsert ตาม unique key `(session_id, location_id, product_id)`

**POST `/api/v1/sessions/{id}/submit`** — ปิดยอด location
```json
{ "location_id": "uuid" }
```
→ set `location_submissions.status = 'submitted'`, `submitted_at = now()`

---

## 6. Admin Dashboard — หน้าที่แต่ละหน้า

- **Dashboard (Monitoring)** — เลือกรอบ → grid 5 locations แสดง ✅ submitted / ⏳ pending
  + เวลาส่ง + จำนวน line ที่นับ
- **Products / Categories / Locations** — CRUD ตรงไปตรงมา (capacity_ml บังคับ > 0)
- **Sessions** — สร้างรอบใหม่ (auto สร้าง location_submissions ให้ครบ 5 จุดเป็น pending),
  ปิดรอบ (status=closed), เข้าดูรายละเอียด + export

---

## 7. Export Spec

ปุ่ม export → `.xlsx` (default) หรือ `.csv` จัดคอลัมน์ให้เปิด Excel ทำ report ต่อได้ทันที

| คอลัมน์ | ที่มา |
|---|---|
| Session | count_sessions.name |
| Count Date | count_sessions.count_date |
| Location | locations.name |
| Category | categories.name |
| Product | products.name |
| SKU | products.sku |
| Capacity (ML) | count_lines.capacity_ml_snapshot |
| Full Bottles | count_lines.full_bottles |
| Leftover (ML) | count_lines.leftover_ml |
| **Net Bottles** | count_lines.net_bottles (ปัด 3 ตำแหน่ง) |
| **Value (฿)** | net_bottles × products.price_per_unit (ว่างถ้าไม่มีราคา) |
| Submitted At | location_submissions.submitted_at |

เรียง: Location → Category → Product
(option: sheet สรุปแยกอีกแท็บ = รวม net_bottles ต่อ product ทั้งรอบ)

---

## 8. Environment Variables (`.env.local.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # ใช้เฉพาะฝั่ง server (API export / upsert)
```

> ⚠️ Supabase free tier จำกัด 2 projects — เคยชนเพดานมาแล้ว
> ถ้าเต็ม: reuse project เดิมโดยแยก schema/prefix, upgrade Pro, หรือปิดตัวเก่าที่ไม่ใช้

---

## 9. แนะนำลำดับการ build (ส่งให้ Claude Code ทีละสเต็ป)

0. **Master data พร้อมแล้ว** — `seed.sql` gen จาก Sheet1 ของไฟล์ TEST:
   6 locations (Main/Service/Terrace/Rooftop + Store on Pier + Store on Boat=STORE YONA),
   25 categories, 222 products (SKU auto: `VDK-001`, `TEQ-003`…) แยก count_mode ให้แล้ว
1. รัน migration + seed → ตรวจ schema ใน Supabase
2. gen TypeScript types จาก Supabase → `src/types`
3. `lib/calc/net-bottles.ts` + unit test (lock สูตรก่อน)
4. Master data CRUD (Products / Categories / Locations)
5. Sessions + Monitoring dashboard
6. Mobile API (`bootstrap` → `counts` → `submit`)
7. Export (.xlsx/.csv)
8. รัด RLS ให้ staff เขียนได้เฉพาะ location ตัวเอง
