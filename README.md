# 🛡️ ROParts.in Standalone Master Admin Panel

A standalone, high-security Operations & Dispatch Console for **ROParts.in**, guarded by **Fixed Google Authenticator (RFC 6238 TOTP) MFA**.

---

## 🔑 Fixed Google Authenticator Credentials

- **Account:** `admin@roparts.in`
- **Issuer:** `ROParts.in`
- **Permanent Secret Key:** `ROPARTSMFAADMIN1` *(Scan once into Google Authenticator)*
- **Algorithm:** RFC 6238 TOTP (HMAC-SHA1, 30s step, 6 digits)
- **Session Cookie:** `roparts_admin_jwt` (HttpOnly, SameSite=Lax, Signed HMAC-SHA256, 8-hour validity)

---

## 🚀 How to Run Locally

```bash
cd admin-app
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🌐 How to Host Separately

### Option 1: Deploy to Vercel (e.g. `admin.roparts.in`)
1. Create a new repository or push `admin-app` folder to GitHub.
2. In Vercel, click **Add New Project** and select the `admin-app` root.
3. Configure Environment Variables in Vercel Project Settings:
   - `ADMIN_TOTP_SECRET`: `ROPARTSMFAADMIN1`
   - `SESSION_SECRET`: `rp_prod_secret_key_tamper_guard_982347182937`
4. Add custom domain: `admin.roparts.in`.

### Option 2: Deploy to Netlify
```bash
npm run build
# Netlify Next.js adapter handles routing automatically
```

### Option 3: Deploy as Dedicated AWS Lambda Service
Use the included serverless deployer in the root project:
```bash
node scripts/deploy-admin-lambda.mjs
```

---

## 📦 Features Included

1. **🔒 Fixed Google Authenticator MFA**:
   - High-contrast QR Code generated dynamically on login.
   - Manual key copy fallback.
   - 6-box auto-advancing PIN input.
2. **📦 Live Orders & Dispatch Hub**:
   - Live stream of incoming orders.
   - Status transitions (`Confirmed`, `Packed`, `Out for Delivery`, `Delivered`).
   - Local delivery boy assignment (`Name`, `Phone`).
   - **📍 Live GPS Pinpoint links** directly opening Google Maps navigation for couriers.
   - **💬 One-Tap WhatsApp trigger** to send instant dispatch notifications to the customer.
3. **🏷️ Product Catalog & Inventory**:
   - Quick inline price (₹) and stock count editor.
   - Add new product modal.
4. **🎟️ Coupons & Promotions**:
   - Create, list, and delete discount voucher codes.
5. **👥 Technicians & GPS Address Registry**:
   - Customer directory with live Google Maps navigation links.
