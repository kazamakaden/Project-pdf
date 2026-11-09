# วิทยาลัยเทคนิคอุดรธานี — ระบบพัสดุสำนักงาน & ใบขออนุมัติสั่งซื้อ

เว็บแอปพลิเคชันสำหรับงานพัสดุ/วัสดุสำนักงาน ของวิทยาลัยเทคนิคอุดรธานี
พร้อมระบบ **สร้างใบขออนุมัติสั่งซื้อและดาวน์โหลดเป็น PDF** ขนาด A4
(แบบฟอร์มเดียวกันกับไฟล์ `Expense_Estimation_Form.xlsx` ทุกช่อง รวมหัวข้อ “ความสอดคล้องกับนโยบาย”)
ข้อมูลสินค้าตั้งต้นแปลงมาจากไฟล์ `หลิ่มหมงใบเสนอราคาวัสดุสำนักงาน_2570.xlsx` (252 รายการ)
และเพิ่ม/แก้ไข/อัปโหลดรูปได้เองผ่านหน้า **ผู้ดูแลระบบ** ที่เข้าสู่ระบบด้วย Google

**ข้อมูลสินค้าเก็บในฐานข้อมูลกลาง (MongoDB Atlas) ผ่าน Netlify Functions**
→ แอดมินแก้ไขที่ไหนก็ได้ ผู้ใช้ทุกคนเห็นข้อมูลเดียวกันทันที (ตะกร้า/ธีมยังเก็บใน `localStorage`)
Deploy ขึ้น **Netlify** ได้ในโปรเจกต์เดียว เพราะหน้าเว็บและ API อยู่โดเมนเดียวกัน

---

## 📚 เอกสารสำหรับผู้ใช้งาน / ผู้ดูแลระบบ (ภาษาไทย)

| เอกสาร | เหมาะกับ | เนื้อหา |
| --- | --- | --- |
| 📘 [คู่มือผู้ดูแลระบบ](docs/คู่มือผู้ดูแลระบบ.md) | ครู / แอดมิน / ผู้ใช้ทั่วไป | วิธีใช้แคตตาล็อก, ตะกร้า, สร้างใบขออนุมัติสั่งซื้อ, จัดการทำเนียบบุคลากร, ล็อกอิน, เพิ่ม-แก้-ลบสินค้า, FAQ |
| 🛠️ [คู่มือติดตั้งและส่งมอบระบบ](docs/คู่มือติดตั้งและส่งมอบระบบ.md) | นักพัฒนา / คนดูแลเว็บ | สถาปัตยกรรม, env vars, ตั้ง MongoDB + Google, deploy Netlify, **วิธีเปลี่ยนแอดมิน/ฐานข้อมูล**, เช็กลิสต์ส่งมอบ |

> 💡 ถ้าเพิ่งรับงานต่อหรือจะส่งมอบให้คนใหม่ **อ่านคู่มือติดตั้งและส่งมอบระบบ หัวข้อ 8 และ 12 ก่อน**

---

## ✨ ฟีเจอร์

- **แคตตาล็อกสินค้า 252 รายการ** — ช่องค้นหา + **แท็บหมวดหมู่แบบคลิกเดียว** + ตัวกรองขนาด + เรียงลำดับ (ลำดับ, ชื่อ ก-ฮ, ราคา)
- **รูปสินค้า** — แสดงภาพปกการ์ดสินค้า (อัปโหลดผ่านหน้าผู้ดูแล ระบบย่อ/บีบอัดให้อัตโนมัติ)
- **ตะกร้าสินค้า** — เพิ่ม/ลด/ลบ, ปรับจำนวน, คงอยู่หลังรีเฟรช (persist), แสดงแบบ Drawer และหน้าเต็ม
- **คิด VAT 7%** — เปิด/ปิดได้ในหน้าตะกร้า (เอกสารแสดงยอดรวมเป็น “รวมค่าวัสดุ” ตามแบบฟอร์ม)
- **ใบขออนุมัติสั่งซื้อ A4** — หัวเอกสารหน่วยงาน, ชื่อผู้ขอ/หน่วยงาน, หัวข้อ **“ความสอดคล้องกับนโยบาย”** 5 รายการ (พร้อมช่องติ๊ก), ตาราง 7 คอลัมน์ (ลำดับที่/รายการ/จำนวน/หน่วย/ราคา-หน่วย/รวมเงิน/หมายเหตุ) และแถว **รวมค่าวัสดุ**
- **ทำเนียบบุคลากร** — หน้าใหม่ให้แอดมินเพิ่ม/แก้ไข/ลบ ชื่อ-ตำแหน่ง (เก็บใน MongoDB) และแสดงรายชื่อใน Footer ทุกหน้า
- **ดาวน์โหลด PDF** ด้วย `html2pdf.js` (หน้าจอ = ไฟล์ที่ได้)
- **หน้าผู้ดูแลระบบ (Admin)** — ล็อกอินด้วย Google, เพิ่ม/แก้ไข/ลบสินค้า, อัปโหลดรูป, คืนค่าเริ่มต้น
- **ฐานข้อมูลกลาง (MongoDB)** — สินค้า รูป และทำเนียบบุคลากร บันทึกผ่าน API `/api/products` และ `/api/personnel` ไม่ผูกกับเบราว์เซอร์เครื่องใดเครื่องหนึ่ง
- **ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์** — API ตรวจลายเซ็น Google ID token จริงก่อนอนุญาตให้บันทึกข้อมูล
- **โหมดทดสอบบนเครื่อง** — เปิดเว็บที่ `localhost` แล้วกด "เข้าสู่ระบบแบบโลคอล" ในหน้าผู้ดูแล
  ไม่ต้องตั้งค่า Google OAuth (ปุ่มนี้แสดงเฉพาะเมื่อเปิดบนเครื่อง จะไม่แสดงบนเว็บที่ deploy แล้ว)
- **โหมดสว่างเป็นค่าเริ่มต้น** — ไม่ตามธีมของระบบ ปุ่มบน Header ยังสลับเป็น Dark mode ได้และจำค่าไว้
- **โลโก้หน่วยงาน** — ไฟล์ `public/logo.png` ใช้ร่วมกันทั้ง Header, Footer และหัวใบขออนุมัติสั่งซื้อ
- **ไอคอนแอนิเมชันบน Header** — เมนู/สลับโหมด/ตะกร้า ใช้ `@animateicons/react` เล่นแอนิเมชันเมื่อ hover หรือคลิกที่ปุ่ม
- **Dark mode** + ธีมสี 60/30/10 (Canvas / Royal Blue / Amber Accent)
- **Responsive** รองรับมือถือ แท็บเล็ต เดสก์ท็อป

---

## 🧱 เทคโนโลยี

| ส่วน | เทคโนโลยี |
| --- | --- |
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS 3 + shadcn/ui style components |
| State | Zustand (+ persist) |
| Auth (Admin) | Google Identity Services (Sign in with Google) |
| Icons | lucide-react + @animateicons/react (ไอคอนแอนิเมชันบน Header) |
| PDF | html2pdf.js (html2canvas + jsPDF) |
| Backend | Netlify Functions (TypeScript, เสิร์ฟที่ `/api/*`) |
| Database | MongoDB Atlas (official `mongodb` driver) |
| ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ | `google-auth-library` (verify Google ID token) |
| Fonts | Sarabun / Prompt (Google Fonts) |

---

## 🚀 เริ่มใช้งาน

ต้องใช้ **Node.js 20 ขึ้นไป** (ดูเวอร์ชันใน `.nvmrc`)

```bash
npm install
copy .env.example .env   # แล้วแก้ค่าด้านใน (Google Client ID + อีเมลเจ้าของ + MONGODB_URI)
npm run dev      # เปิด http://localhost:5173 (มี API /api/* ให้ทดสอบด้วย)
```

> **ยังไม่ต้องตั้งค่าฐานข้อมูลก็รันได้** — เมื่อไม่มี `MONGODB_URI` ระบบจะเก็บข้อมูลสินค้าไว้ที่ไฟล์
> `.local-db/products.json` ในเครื่อง (เฉพาะโหมด dev) เพื่อให้ลองเพิ่ม/แก้/ลบได้ครบทุกปุ่ม
> ถ้าเชื่อมต่อฐานข้อมูลไม่ได้เลย เว็บจะแสดง "ข้อมูลสำรอง" ที่ฝังมากับเว็บแทน (มีแบนเนอร์สีเหลืองแจ้ง)
>
> **ข้อมูลตั้งต้นถูกใส่ให้อัตโนมัติ** — ครั้งแรกที่เปิดเว็บแล้วฐานข้อมูลว่าง ระบบจะเขียนสินค้า 252 รายการ
> ลงฐานข้อมูลให้ทันที (ทำครั้งเดียว ไม่ทับข้อมูลที่แอดมินแก้ไข/นำเข้าเอง) จึงไม่ต้องล็อกอินแอดมิน
> กด "นำเข้าข้อมูลตั้งต้น" อีก — ถ้าผู้ใช้ MongoDB เป็น read-only การ seed จะไม่สำเร็จ
> และเว็บยังแสดงข้อมูลสำรองพร้อมแบนเนอร์ (ดู error ใน Netlify → Functions → logs)

### Build สำหรับ Production

```bash
npm run build    # typecheck + สร้าง dist/
npm run preview  # ทดสอบไฟล์ dist/ ในเครื่อง
npm run typecheck
```

### Smoke test หน้าจอจริง (ทางเลือก)

```bash
npm run dev -- --port 5199   # เทอร์มินัลที่ 1
npm run smoke                # เทอร์มินัลที่ 2 (ใช้ Chrome headless ผ่าน CDP)
```

ตรวจ 30 กรณี: โหมดสว่างเป็นค่าเริ่มต้น + ปุ่มสลับธีม, โลโก้ใน Header/Footer/ใบขออนุมัติสั่งซื้อ,
ล็อกอินแบบโลคอล (โหมดทดสอบ) โดยไม่ใช้ Google, แคตตาล็อก/ตัวกรองขนาด, หน้าผู้ดูแล,
เพิ่มสินค้าและยืนยันว่าบันทึกผ่าน API จริง, ข้อมูลคงอยู่ในฐานข้อมูลหลังรีเฟรช,
ลบข้อมูลทดสอบคืน, ข้อมูลหน่วยงานในใบขออนุมัติสั่งซื้อ, หัวข้อ “ความสอดคล้องกับนโยบาย”,
ไม่มีบรรทัด “(ตัวอักษร)”/ผู้ลงนามเดิม, API + หน้าทำเนียบบุคลากร และต้องไม่มี console error
(ถ้า Chrome ไม่ได้อยู่ที่ path เริ่มต้น ให้ตั้ง `CHROME_PATH`)

> หมายเหตุบน Windows PowerShell: หากถูก Execution Policy บล็อก `npm.ps1` ให้เรียกด้วย `npm.cmd` แทน

---

## 📁 โครงสร้างโปรเจกต์

```
.
├── index.html
├── .env.example
├── netlify.toml
├── netlify/
│   └── functions/
│       ├── products.ts       # API /api/products (GET / POST / PUT / DELETE)
│       ├── personnel.ts      # API /api/personnel (GET / POST / PUT / DELETE)
│       └── lib/              # auth (ตรวจ Google token), repo, personnelRepo (MongoDB/ไฟล์), http helpers
├── public/
│   ├── favicon.svg
│   └── logo.png            # โลโก้หน่วยงาน (คัดลอกจาก Photo/Logo.png)
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── scripts/
│   ├── extract-catalog.mjs   # อ่านข้อมูลจาก .xlsx -> catalog-raw.json
│   └── gen-products.mjs      # แปลง -> src/data/products.ts
└── src/
    ├── main.tsx / App.tsx
    ├── index.css
    ├── config/site.ts        # ชื่อหน่วยงาน/ที่อยู่/อีเมลแอดมิน (แก้ที่เดียว)
    ├── data/products.ts      # 252 รายการ (auto-generated)
    ├── types/                # Product, Person, BasketItem, Quotation, Navigation
    ├── lib/
    │   ├── api.ts            # ตัวเรียก API (/api/products, /api/personnel): list/create/update/delete
    │   ├── utils.ts          # cn() helper (clsx + tailwind-merge)
    │   ├── googleAuth.ts     # โหลด Google Identity Services + ตรวจ ID token
    │   └── image.ts          # ย่อ/บีบอัดรูปสินค้าเป็น data URL
    ├── utils/
    │   ├── bahttext.ts       # จำนวนเงิน -> ตัวอักษรไทย
    │   ├── calc.ts           # คำนวณยอด/VAT
    │   └── format.ts         # จัดรูปแบบเงิน/วันที่ (พ.ศ.)
    ├── store/                # zustand: basket, theme, ui(toast), auth, products, personnel
    ├── components/
    │   ├── ui/               # button, card, input, select, sheet, table, ...
    │   ├── layout/           # Header, Footer
    │   ├── catalog/          # ProductCatalog, ProductFilters, ProductCard
    │   ├── basket/           # BasketDrawer, BasketPage
    │   ├── admin/            # LoginPage, AdminPanel, ProductForm
    │   ├── personnel/        # PersonnelPage (ทำเนียบบุคลากร)
    │   └── quotation/        # QuotationPDF, QuotationForm, QuotationPreview
```

---

## 🔄 แหล่งข้อมูล / Regenerate แคตตาล็อก

`src/data/products.ts` ถูก generate จากไฟล์ Excel โดยสคริปต์:

```bash
node scripts/extract-catalog.mjs   # สร้าง catalog-raw.json จาก .xlsx
node scripts/gen-products.mjs      # สร้าง src/data/products.ts
```

คอลัมน์ต้นทาง: `ลำดับ | รายการ | ขนาด | รุ่น | ยี่ห้อ | หน่วยนับ | ราคา | หมายเหตุ`

ระบบจะกำหนด **หมวดหมู่** ให้อัตโนมัติจากชื่อสินค้า (e.g. กระดาษและสมุด, เครื่องเขียน, กาวและเทป,
อุปกรณ์สำนักงาน, แฟ้มและจัดเก็บ, หมึกและงานพิมพ์, กระดานและป้าย, วัสดุคอมพิวเตอร์, อื่น ๆ)

> สินค้าที่ไม่มีราคาในไฟล์ต้นฉบับ (17 รายการ) จะถูกตั้งราคาเป็น 0 และแสดงผลเป็น **"สอบถามราคา"**

---

## 🗄️ ฐานข้อมูล MongoDB Atlas + API

### 1) สร้างฐานข้อมูล (ทำครั้งเดียว)

1. เข้า https://cloud.mongodb.com → สร้าง **Free Cluster (M0)**
2. *Database Access* → เพิ่มผู้ใช้ (username / password)
3. *Network Access* → เพิ่ม IP `0.0.0.0/0` (Netlify Functions ใช้ IP ไม่คงที่)
4. *Connect → Drivers* → คัดลอก connection string
5. ใส่ค่าใน `.env` (เครื่องนี้) และใน Netlify → *Site settings → Environment variables*

   ```env
   MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=udtc
   ADMIN_EMAIL=owner@gmail.com
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```

6. รัน `npm run dev` (หรือ deploy แล้วเปิดเว็บ) → ระบบจะเขียนสินค้า 252 รายการลง collection `products`
   ให้อัตโนมัติเมื่อเปิดแคตตาล็อกครั้งแรก
   หรือจะเข้าหน้า **ผู้ดูแลระบบ → นำเข้าข้อมูลตั้งต้น** เพื่อเขียนทับเองก็ได้

### 2) Endpoints (Netlify Functions)

**สินค้า** — `netlify/functions/products.ts` (collection `products`)

| Method | Path | สิทธิ์ | หน้าที่ |
| --- | --- | --- | --- |
| `GET` | `/api/products` | สาธารณะ | รายการสินค้าทั้งหมด |
| `POST` | `/api/products` | แอดมิน | เพิ่มสินค้าใหม่ |
| `POST` | `/api/products` + `{"mode":"replace","products":[...]}` | แอดมิน | เขียนทับทั้งคลัง (seed / คืนค่า) |
| `PUT` | `/api/products?id=p001` | แอดมิน | แก้ไขสินค้า |
| `DELETE` | `/api/products?id=p001` | แอดมิน | ลบสินค้า |

**ทำเนียบบุคลากร** — `netlify/functions/personnel.ts` (collection `personnel`)

| Method | Path | สิทธิ์ | หน้าที่ |
| --- | --- | --- | --- |
| `GET` | `/api/personnel` | สาธารณะ | รายชื่อบุคลากร (ใช้ใน Footer + หน้าทำเนียบบุคลากร) |
| `POST` | `/api/personnel` + `{"name":"...","position":"..."}` | แอดมิน | เพิ่มบุคลากร |
| `PUT` | `/api/personnel?id=ps123` | แอดมิน | แก้ไขชื่อ/ตำแหน่ง |
| `DELETE` | `/api/personnel?id=ps123` | แอดมิน | ลบบุคลากร |

- สิทธิ์แอดมิน = แนบ header `Authorization: Bearer <Google ID token>`
  (โหมดทดสอบบนเครื่องใช้ `Bearer local-admin:<อีเมล>` ซึ่งเซิร์ฟเวอร์รับเฉพาะตอน dev)
- โค้ดฝั่งเว็บเรียก API ผ่าน `src/lib/api.ts` / ฝั่งเซิร์ฟเวอร์อยู่ที่ `netlify/functions/`
- ถ้า production ไม่ได้ตั้ง `MONGODB_URI` → API ตอบ `503` และเว็บจะใช้ข้อมูลสำรองที่ฝังมากับเว็บ
  (ทำเนียบบุคลากรจะแสดงว่างจนกว่าจะเชื่อมต่อฐานข้อมูลได้)

---

## 🔐 หน้าผู้ดูแลระบบ (Admin) + Google Login

1. ไปที่ Google Cloud Console → *APIs & Services → Credentials*
2. *Create credentials → OAuth client ID → Web application*
3. เพิ่ม **Authorized JavaScript origins**: `http://localhost:5173` และ `https://<โดเมนจริง>`
4. คัดลอก Client ID ใส่ไฟล์ `.env`

   ```env
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   VITE_ADMIN_EMAIL=owner@gmail.com
   ```

5. รีสตาร์ท `npm run dev` แล้วเข้าที่เมนู **ผู้ดูแลระบบ** ในแถบนำทาง

**สิทธิ์:** ระบบอนุญาตเฉพาะบัญชีที่อีเมลตรงกับ `VITE_ADMIN_EMAIL` (ถ้าไม่ตั้งจะใช้ค่าเริ่มต้นใน
`src/config/site.ts`) อีเมลอื่นที่ล็อกอินสำเร็จจะถูกปฏิเสธพร้อมข้อความแจ้งเตือน

| การทำงาน | ผลลัพธ์ |
| --- | --- |
| เพิ่มสินค้าใหม่ | บันทึกผ่าน `POST /api/products` ลง MongoDB และแสดงในแคตตาล็อกทันที |
| แก้ไขสินค้าเดิม | บันทึกทับเฉพาะฟิลด์ที่เปลี่ยน (`PUT /api/products?id=...`) แล้วติดป้าย "แก้ไข" |
| ลบสินค้า | ลบออกจากฐานข้อมูล (`DELETE /api/products?id=...`) |
| อัปโหลดรูป | ย่อเป็น JPEG (ด้านยาวสุด ~720px) แล้วเก็บเป็น data URL ใน MongoDB |
| คืนค่าตั้งต้น | เขียนทับทั้งคลังด้วยข้อมูลตั้งต้น 252 รายการ (`{"mode":"replace"}`) |

> ⚠️ ทุกการแก้ไขต้องผ่านการตรวจสิทธิ์ที่เซิร์ฟเวอร์ (Google ID token + อีเมล `ADMIN_EMAIL`)
> ถ้า API ยังไม่พร้อม เว็บจะแสดงข้อมูลสำรองพร้อมปุ่ม "นำเข้าข้อมูลตั้งต้น" ในหน้าผู้ดูแลระบบ
>
> 💡 `GET /api/products` จะใส่ข้อมูลตั้งต้นให้อัตโนมัติ **เฉพาะครั้งแรกที่ฐานข้อมูลว่าง** เท่านั้น
> (ใช้ marker `meta/catalog-seed-v1` กัน seed ซ้ำ) หลังจากนั้นระบบไม่ยุ่งกับข้อมูลอีก

---

## 🌐 Deploy บน Netlify

โปรเจกต์มี `netlify.toml` พร้อมใช้งาน:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`
- SPA redirect (`/*` -> `/index.html`)
- Functions: `netlify/functions` → API ถูกเสิร์ฟที่ `/api/*`
- Environment variables ที่ต้องตั้ง: `MONGODB_URI`, `MONGODB_DB`, `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`
  (ฝั่งเว็บใช้ `VITE_GOOGLE_CLIENT_ID`, `VITE_ADMIN_EMAIL`)

**วิธี deploy:**

1. Push โค้ดขึ้น Git repository
2. ที่ Netlify เลือก *Add new site → Import an existing project*
3. เลือก repo (Netlify จะอ่าน `netlify.toml` เอง) แล้วกด Deploy
4. *Site settings → Environment variables* → ใส่ค่าตามหัวข้อ MongoDB แล้ว redeploy
5. เปิดเว็บหนึ่งครั้ง — ระบบจะเขียนข้อมูลตั้งต้น 252 รายการลงฐานข้อมูลให้อัตโนมัติ
   (หรือเข้าหน้า **ผู้ดูแลระบบ → นำเข้าข้อมูลตั้งต้น** หากต้องการเขียนทับเอง)

หรือลากโฟลเดอร์ `dist/` ไปวางใน Netlify Drop (หลังรัน `npm run build`)

---

## ℹ️ หมายเหตุ / ข้อจำกัด

- PDF ถูกสร้างด้วยการ render หน้าเว็บเป็นภาพ (html2canvas) จึงควรโหลดฟอนต์ Sarabun ให้เสร็จก่อนกดดาวน์โหลด
- ใบขออนุมัติสั่งซื้อแสดงผลแนวนอนกว้าง 794px (A4 @ 96dpi) — บนจอเล็กจะเลื่อนแนวนอนได้
- เอกสารเป็นแบบฟอร์มเปล่าสำหรับพิมพ์/เซ็นจริง: ไม่มีช่องลงนาม ไม่มีเลขที่เอกสาร และไม่มีบรรทัด “(ตัวอักษร)”
- ข้อมูลทั้งหมดเป็น mock/ตัวอย่างจากไฟล์ Excel ไม่มีการเชื่อมต่อระบบบัญชีหรือชำระเงิน
- เปิด/ปิด VAT ได้ในตะกร้า แต่ไม่มีระบบใบกำกับภาษีอย่างเป็นทางการ (เอกสารแสดงยอดรวมเป็น “รวมค่าวัสดุ”)
- **การล็อกอินตรวจ 2 ชั้น**: เบราว์เซอร์ตรวจ payload (aud / iss / exp / email_verified) และ
  **API ตรวจลายเซ็น Google ID token จริงด้วย `google-auth-library`** ทุกครั้งที่บันทึก
  โดยอนุญาตเฉพาะอีเมล `ADMIN_EMAIL` เท่านั้น
- รูปสินค้าเก็บเป็น data URL (base64) ใน MongoDB — เหมาะกับสินค้าหลักสิบถึงหลักร้อยรายการ
  หากในอนาคตมีรูปจำนวนมากควรย้ายไปเก็บที่ Cloudinary / S3 / Netlify Blobs แล้วเก็บแค่ URL
- หน้าเว็บอ่านสินค้าและทำเนียบบุคลากรจาก API ทุกครั้งที่เปิด (ไม่แคชใน localStorage) หากเชื่อมต่อฐานข้อมูลไม่ได้
  จะแสดงข้อมูลสำรองที่ฝังมากับเว็บพร้อมแบนเนอร์แจ้งเตือน (ทำเนียบบุคลากรจะแสดงว่าง)

---

## 🏢 ข้อมูลหน่วยงาน

- **ชื่อ:** วิทยาลัยเทคนิคอุดรธานี (Udon Thani Technical College)
- **ที่อยู่:** เลขที่ 3 ถนนวัฒนานุวงศ์ ตำบลหมากแข้ง อำเภอเมือง จังหวัดอุดรธานี 41000
- **โทร:** 042-221538 · **โทรสาร:** 042-240031, 042-246038
- **อีเมล:** webmaster@udontech.ac.th
- **เว็บไซต์:** หน้างานพัสดุ วิทยาลัยเทคนิคอุดรธานี

> ค่าเหล่านี้แก้ไขได้ที่ `src/config/site.ts` จุดเดียว (ใช้ทั้ง Header, Footer และหัวใบขออนุมัติสั่งซื้อ)
> ส่วน **รายชื่อ/ตำแหน่งบุคลากร** ไม่อยู่ในไฟล์นี้ — แอดมินเพิ่ม/แก้ไขได้ที่เมนู “ทำเนียบบุคลากร” (เก็บใน MongoDB)