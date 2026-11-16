# ย้ายเว็บขึ้น Render.com (แทน Netlify)

## 1. สร้าง service
1. เข้า https://render.com → **Sign in with GitHub** (บัญชี kazamakaden)
2. **New → Blueprint** → เลือก repo `kazamakaden/Project-pdf` → **Apply**
   (ถ้าไม่ใช้ Blueprint: New → Web Service → Build Command `npm ci && npm run build:render`, Start Command `node server/index.mjs`)

## 2. ใส่ค่า Environment
- เปิด service → **Environment** → **Add from .env**
- วางเนื้อหาไฟล์ `.env.render.example` แล้วเติมค่าจริง (หรือใช้ `node scripts/env-to-render.mjs .env` เพื่อแปลง .env เดิม)
- ค่าที่จำเป็น: `MONGODB_URI`, `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `VITE_ADMIN_EMAIL`, `ADMIN_EMAIL`
- ค่า `VITE_*` ถูกฝังตอน build → ถ้าแก้ต้องกด **Manual Deploy → Deploy latest commit** ใหม่

## 3. Google OAuth
Google Cloud Console → Credentials → OAuth Client → **Authorized JavaScript origins**
เพิ่ม `https://<ชื่อ-service>.onrender.com` (และโดเมนจริงถ้ามี)

## 4. โดเมน
- Render ให้ฟรีที่ `<service>.onrender.com`
- โดเมนของวิทยาลัย: **Settings → Custom Domains → Add** แล้วชี้ CNAME ไปที่ `<service>.onrender.com`

## 5. ข้อควรรู้
- Free plan: ไม่มีคนใช้ 15 นาทีจะ sleep → เปิดครั้งแรกช้า ~30-50 วิ
- ฐานข้อมูลไม่ต้องย้าย ยังใช้ MongoDB Atlas เดิม (ตรวจว่า Atlas เปิด IP `0.0.0.0/0` หรือ allow Render)
- Netlify เดิมยังออนไลน์อยู่ ใช้เป็นตัวสำรองได้จนกว่าจะพอใจ Render
