# 💎 ACE LIVE Tracking System

ระบบบันทึกและจัดการยอด Diamond & KPI ประจำวันสำหรับ MC & VJ (Web Application บน Google Apps Script)

## 📌 คุณสมบัติหลัก (Features)
- 📊 **บันทึกยอด Diamond รายวัน:** รองรับการลงข้อมูลรายทีม, ตัดรอบเวลา 08:00 น. อัตโนมัติ
- 🏆 **สรุป Dashboard & Leaderboard:** แสดงยอดรวม, MVP ประจำวัน/เดือน, กราฟแนวโน้ม
- 🎯 **ระบบจัดการ KPI:** ตั้งเป้าหมายรายบุคคล / กระจายเป้าหมายทั้งทีมอัตโนมัติ
- 📜 **System Audit Logs:** บันทึกประวัติการใช้งานอย่างครอบคลุม
- 📄 **Multi-Format Export:** ส่งออกรายงาน Excel (.xlsx), PDF, Word (.doc) และสร้างรายงาน Google Docs 2 ภาษา (ไทย/จีน)

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
ace-live-tracking/
├── Code.gs             # Backend logic (Google Apps Script)
├── Index.html          # Frontend UI (Tailwind CSS, Chart.js, HTML)
├── appsscript.json     # Manifest file ของ Google Apps Script
├── .clasp.json.sample  # ตัวอย่างไฟล์คอนฟิกสำหรับ Google Clasp CLI
├── .gitignore          # ไฟล์ละเว้นสำหรับการอัปโหลด Git
└── README.md           # เอกสารอธิบายโปรเจกต์
```

---

## 🚀 วิธีการติดตั้งและอัปโหลดขึ้น Google Apps Script

### วิธีที่ 1: ติดตั้งผ่าน Google Apps Script Editor (Manual)
1. ไปที่ [Google Apps Script](https://script.google.com/) แล้วสร้างโปรเจกต์ใหม่ (**New Project**)
2. คัดลอกโค้ดจาก `Code.gs` วางในไฟล์ `Code.gs` บน Editor
3. กดบวก `+` เพิ่มไฟล์ HTML ตั้งชื่อว่า `Index` แล้วนำโค้ดจาก `Index.html` ไปวาง
4. เปลี่ยน `SPREADSHEET_ID` ในไฟล์ `Code.gs` ให้เป็น ID ของ Google Sheets ที่คุณใช้งาน
5. กด **Deploy** > **New deployment** > เลือกประเภท **Web app**
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
6. คัดลอก Web App URL นำไปใช้งานได้ทันที

### วิธีที่ 2: ติดตั้งผ่าน Google Clasp CLI
```bash
# 1. ติดตั้ง Clasp
npm install -g @google/clasp

# 2. ล็อกอินเข้าสู่ระบบ Google Account
clasp login

# 3. Clone หรือสร้าง Script
clasp create --type webapp --title "ACE LIVE Tracking"

# 4. Push โค้ดขึ้น Apps Script
clasp push
```

---

## 🛠️ โครงสร้าง Google Sheets ที่ต้องเตรียม

เพื่อให้ระบบทำงานได้อย่างสมบูรณ์ Google Sheets ของคุณควรมีชีตชื่อต่อไปนี้:
1. `Admin_Users`: สำหรับการล็อกอินผู้ใช้งาน (`A: Username`, `B: Password`, `C: Name`, `D: Role`)
2. `Team Data`: รายชื่อทีมและ MC ผู้ดูแล
3. `vj mc all`: รายชื่อ VJ, ทีมสังกัด, TikTok ID
4. `KPI_Targets`: ข้อมูลเป้าหมาย KPI
5. `Submission_Logs`: ประวัติการกดส่งยอด
6. `System_Logs`: ประวัติกิจกรรมระบบ
7. ชีตชื่อประจำเดือน (เช่น `JANUARY 2026`, `FEBRUARY 2026` เป็นต้น)

---

## 📄 License & Attribution
Developed for MC & VJ Management | ACE LIVE Tracking System
