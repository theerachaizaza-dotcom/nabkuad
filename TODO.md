# NabKuad — งานที่ต้องทำต่อ

> อัปเดต: 3 ก.ค. 2026 (ตี 3 กว่า) — หยุดพักหลังทำ core เสร็จ
> สถานะ: **นับได้ครบวงจรจริง** (นับ → เซฟ → เข้า DB → ดูสถานะ)

---

## ✅ ทำเสร็จแล้ว

- Database บน Supabase (โปรเจกต์ Yona Beach Club) — 7 ตาราง สะอาด
- Master data: 222 สินค้า · 25 หมวด · 6 locations + ราคา
- หน้า Products (CRUD + search)
- หน้า Sessions (สร้าง/ดูรอบนับ)
- หน้า Monitoring (สถานะ submitted/pending ต่อ location)
- Mobile API: bootstrap / counts / submit — **logic ทบเศษ + capacity snapshot ผ่าน test**
  (ยืนยันแล้ว: 898ml → 6 ขวด + 198ml · net 6.283 ✓)
- หน้านับ mobile `/count` — นับ + save + submit เข้า DB ได้

---

## 🔜 งานที่เหลือ (เรียงตามความสำคัญ)

### ① Fix Save/Submit  🔴 สำคัญสุด
ปัญหา: หน้า `/count` ต้องกด **Save ก่อน Submit** ไม่งั้นยอดหาย — สตาฟจะงงและทำยอดหาย

Prompt ให้ Claude Code:
```
หน้า /count ตอนนี้ต้องกด Save ก่อน Submit ซึ่งสตาฟจะงงและทำยอดหาย
แก้ให้ปุ่ม Submit บันทึกยอด (save) ให้อัตโนมัติก่อนส่ง — กดปุ่มเดียวจบ
```

---

### ② Deploy ขึ้น Vercel  🔴 ปลดล็อกให้สตาฟเปิดมือถือได้
ตอนนี้รันแค่ localhost สตาฟเปิดไม่ได้ ต้องเอาขึ้นเน็ตก่อน

Prompt ให้ Claude Code:
```
ช่วย deploy โปรเจกต์นี้ขึ้น Vercel:
1. บอกวิธี push ขึ้น GitHub ก่อน
2. ตั้ง environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY) บน Vercel
3. deploy แล้วได้ลิงก์เปิดจากมือถือ
```
⚠️ อย่าลืมตั้ง env vars บน Vercel — ไม่ใช่แค่ในเครื่อง

---

### ③ Login พื้นฐาน  🟡 กันคนนอกเข้ามั่ว
```
เพิ่มระบบ login ด้วย Supabase Auth
admin เข้า /sessions /products /monitoring ได้
สตาฟเข้า /count ได้
```
(ถ้า test กันเองในทีมก่อน จะข้ามไปทำทีหลังก็ได้)

---

### ④ Export .xlsx  🟢 สิ่งที่อยากได้ตั้งแต่แรก
```
ทำ Export ตาม Export Spec ใน ARCHITECTURE.md
ปุ่ม export ที่หน้า session detail → ดึง count_lines join products/locations
ออกเป็น .xlsx คอลัมน์ตาม spec เรียง Location → Category → Product
```

---

### ⑤ แต่ง UI สวย  🟢 ทำท้ายสุด
ลากไฟล์ `nabkuad-mockup.html` เข้า context ให้ Claude Code ทำตามธีม (ink + ทอง + teal)
รวมถึงใส่ `autoComplete="off"` ในช่องกรอก กัน autofill เก่าเด้ง

---

## 📌 เส้นทางสั้นสุดสู่ "test จริงที่บาร์"
ทำ ① → ② (→ ③) = เอาให้สตาฟลองนับจริงได้
④ ⑤ ทำหลัง test เก็บ feedback

ประเมินความพร้อมตอนนี้: **~80-85%**

---

## 🧭 กติกาคุมงานกับ Claude Code
- สั่งทีละสเต็ป ทำเสร็จ **รันเทสต์ก่อน** แล้วค่อยสั่งต่อ
- error ก็อปทั้งก้อนวางกลับให้มันแก้
- ถ้ามันทำเกินที่สั่ง: "หยุด ทำแค่ที่สั่ง"
- ถ้ามันจะใช้ python script หา/แก้ไฟล์: "ไม่ต้องใช้ python แก้ตรงๆ พอ"
- ถ้าแก้โค้ดแล้ว error ไม่หาย: เช็ก (1) เซฟไฟล์แล้วไหม (แท็บเป็น X ไม่ใช่ ●)
  (2) มี dev server เก่าค้างไหม → restart `npm run dev`

## 🧪 เทสต์ API ซ้ำได้ทุกเมื่อ
```powershell
cd nabkuad        # ให้ path เป็น E:\Job\nabkuad\nabkuad
node test-api.mjs
```
ต้องมี session ที่ status=open ก่อน (สร้างที่หน้า /sessions)

## 📄 เอกสารอ้างอิงใน repo
- `ARCHITECTURE.md` — spec ทั้งหมด (API contract, schema, export, net logic)
- `nabkuad-mockup.html` — ดีไซน์เป้าหมาย (ใช้ตอนแต่ง UI)
- `test-api.mjs` — สคริปต์เทสต์ API

## 💾 ก่อนปิดเครื่องทุกครั้ง
```powershell
git add .
git commit -m "ข้อความสรุปงานวันนี้"
```
(ถ้าตั้ง GitHub remote แล้ว ค่อย `git push` กันไฟล์หาย)
