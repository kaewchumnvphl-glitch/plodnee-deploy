# PlodNee Planner — Deploy แบบ Full-stack (เหมือน NativeBridge)

โค้ดจาก Google AI Studio (`cdc367fb-f666-4386-abdd-fa6f64ea857e`) ถูก export มาใส่โปรเจกต์นี้ และเพิ่มชั้นเดียวกับ NativeBridge:

- `server.ts`: Express server ให้บริการ `dist/` + API
- ระบบสมาชิก: ทดลอง 30 วัน → ลงทะเบียน (ชื่อ/อีเมล/เบอร์/Device ID) → จ่าย → รหัส `PN-...` → ใส่ใน Paywall
- `/admin`: สร้างรหัส 30/90/365 วัน, ดู feedback และ event แบบ realtime
- `/api/feedback`, `/api/license/events`: เก็บความคิดเห็น/สถิติ
- PWA: `public/manifest.webmanifest`, `public/sw.js`, ไอคอน 192/512
- โค้ดเปิดใช้งานใช้ prefix `PN-` (ไม่ซ้ำกับ `NB-` ของ NativeBridge)

## 1. ตั้งค่า Environment

ค่าเริ่มต้นที่ใช้ตอนนี้ (เหมือน NativeBridge):

| ตัวแปร | ค่า |
|---|---|
| `LICENSE_SECRET` | ดูใน `SECRETS.txt` ของโปรเจกต์ NativeBridge |
| `ADMIN_SECRET` | `NB-Adm-3PW7M6-WAHQ77` |
| ทดลองใช้ | 30 วัน |
| ราคา | 150 บาท/เดือน |
| PromptPay | 088-9231826 |
| LINE | champion2026 |

> เปลี่ยนข้อมูลชำระเงินได้ที่ `src/config/payment.ts` แล้ว `npm run build` ใหม่

แนะนำให้ตั้ง `GITHUB_STORE_TOKEN` + `GITHUB_STORE_REPO` บน Render เพื่อเก็บข้อมูลลง branch `data-store` (Render ไม่ auto-deploy branch นี้) ถ้าไม่ตั้ง ข้อมูลจะอยู่ใน `.plodnee-data/` และหายตอน restart

## 2. ทดสอบในเครื่อง

```powershell
cd plodnee-deploy
npm install --legacy-peer-deps
npm run build
npm start
```

เปิด:

- `http://localhost:10000/` → ต้องเจอหน้าลงทะเบียนทดลองใช้ 30 วัน
- `http://localhost:10000/admin` → ใส่ `ADMIN_SECRET` → สร้างรหัสได้
- `http://localhost:10000/api/health` → `ok: true`

## 3. Deploy บน Render

วิธีที่ 1 — Blueprint (แนะนำ):

1. Push โฟลเดอร์นี้ขึ้น GitHub repo ใหม่ เช่น `kaewchumnvphl-glitch/plodnee-deploy`
2. Render Dashboard → **New → Blueprint** → เลือก repo นั้น → Apply
3. กรอก `LICENSE_SECRET`, `ADMIN_SECRET`, `APP_URL`, `GITHUB_STORE_TOKEN`, `GITHUB_STORE_REPO` ในหน้า Blueprint
4. รอ build เสร็จ แล้วเปิด `https://plodnee-planner.onrender.com`

วิธีที่ 2 — สร้าง Web Service เอง:

| ฟิลด์ | ค่า |
|---|---|
| Build command | `npm install --no-audit --no-fund --legacy-peer-deps && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Environment | `NODE_ENV=production`, `PORT=10000` + secret ด้านบน |

## 4. หลัง deploy

- ผู้ใช้: `https://<your-domain>/`
- สร้างรหัส: `https://<your-domain>/admin` (รหัสผ่าน = `ADMIN_SECRET`)
- หลังโอนเงิน ลูกค้าส่งสลิปทาง LINE → สร้างรหัส `PN-...` → ส่งให้ลูกค้า → ลูกค้าใส่ในหน้า Paywall
- ดู feedback/event ได้ในหน้า `/admin` (poll ทุก 5 วินาที)

## 5. โครงสร้างที่เพิ่มจาก AI Studio

| ไฟล์ | หน้าที่ |
|---|---|
| `server.ts` | license/admin/feedback/events + static serving |
| `src/lib/license.ts`, `src/lib/device.ts`, `src/lib/promptpay.ts` | client-side license + QR PromptPay |
| `src/components/Paywall.tsx` | หน้าหมดทดลอง / ชำระเงิน / ใส่รหัส |
| `src/components/TrialRegistrationGate.tsx` | ลงทะเบียนก่อนทดลอง |
| `src/components/AdminPanel.tsx` | หน้า `/admin` |
| `src/config/payment.ts` | ข้อมูลชำระเงิน |
| `public/*` | PWA manifest, service worker, icons |
