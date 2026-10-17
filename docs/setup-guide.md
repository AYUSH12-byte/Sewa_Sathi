# SewaSathi — Developer & Evaluator Setup Guide
## Complete Installation, Local Testing & Evaluation Instructions

---

## 1. System Prerequisites

Before starting, ensure your local workstation has the following tools installed:

- **Node.js:** v20.x or higher (LTS recommended).
- **Package Manager:** `npm` (v10+).
- **Database:** Local MongoDB instance running on port `27017` OR a MongoDB Atlas cloud URI.
- **Mobile Development (Optional for live phone testing):**
  - Android device or iPhone with the free **Expo Go** app installed.
  - Alternatively, Android Studio Emulator or iOS Simulator.

---

## 2. Repository Structure

```
Sewa Sathi/
├── backend/            # Express REST API, Mongoose Models & Automated Tests
│   ├── src/            # Core backend source code
│   ├── tests/          # Zero-mock Node native test suite
│   ├── public/admin/   # Single-Page Web Admin Dashboard
│   └── package.json
├── mobile/             # React Native (Expo) Mobile Client
│   ├── src/            # Theme, Navigation, Context, Screens & Components
│   ├── App.js          # App root with SafeArea & AuthProvider
│   └── package.json
└── docs/               # Technical specifications & documentation
```

---

## 3. Backend Setup & Startup

### Step 3.1: Install Dependencies
Open your terminal in the `backend/` directory:
```bash
cd backend
npm install
```

### Step 3.2: Environment Configuration
Ensure `.env` exists in the `backend/` root (a template is provided in `.env.example`):
```env
PORT=7000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/sewasathi
JWT_SECRET=super_secret_jwt_access_key_sewasathi_2026
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_sewasathi_2026
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ESEWA_PRODUCT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
ESEWA_BASE_URL=https://rc-epay.esewa.com.np
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
```

### Step 3.3: Seed Initial Data
Populate categories, catalog services, test users, and verified providers:
```bash
node src/database/seed.js
```

### Step 3.4: Run Automated Tests
Execute the comprehensive zero-mock integration test suite:
```bash
npm test
```
*Expected output: All 17 integration tests pass in ~5 seconds.*

### Step 3.5: Launch Backend Server
```bash
npm run dev
```
The server will boot on `http://localhost:7000`. You can test readiness at:
- Health Check: `http://localhost:7000/api/health`
- DB Readiness: `http://localhost:7000/api/ready`

---

## 4. Web Admin Dashboard Access

1. Open your web browser and navigate to:
   ```
   http://localhost:7000/admin
   ```
2. Log in using the seeded administrative credentials:
   - **Email:** `admin@sewasathi.com`
   - **Password:** `Admin@12345`
3. Features available:
   - Platform KPI Metrics (Total users, active providers, volume).
   - Provider Verification Queue (Inspect KYC, approve or reject).
   - User Account Management (Activate or suspend).
   - Bookings Oversight & Payment Ledger.
   - Review Moderation & Dispute Resolution.

---

## 5. Mobile App Setup & Execution

### Step 5.1: Install Mobile Dependencies
In a new terminal window:
```bash
cd mobile
npm install
```

### Step 5.2: Set Backend IP Address (For Physical Device Testing)
If testing on a physical phone via Expo Go, open `mobile/src/api/client.js` and set `BASE_URL` to your computer's local Wi-Fi IP address (e.g., `http://192.168.1.100:7000/api/v1`). If running on an Android Emulator, use `http://10.0.2.2:7000/api/v1`.

### Step 5.3: Start Expo Dev Server
```bash
npx expo start
```
- Press `a` to run on an attached Android Emulator.
- Press `w` to run directly in a desktop web browser.
- Or scan the terminal QR code using the **Expo Go** camera on your mobile phone.

---

## 6. Seeded Test Credentials

| Role | Email Address | Password | Account Details |
|---|---|---|---|
| **Admin** | `admin@sewasathi.com` | `Admin@12345` | Platform Administrator |
| **Customer** | `customer@sewasathi.com` | `Password@123` | Homeowner in Kathmandu |
| **Provider** | `provider@sewasathi.com` | `Password@123` | Certified Plumber / Electrician |

---

## 7. Troubleshooting

- **MongoDB Connection Error:** Verify MongoDB service is running via `Get-Service MongoDB` (Windows) or `systemctl status mongod` (Linux).
- **Port Conflict (Port 7000 in use):** Change `PORT=7001` in `backend/.env`.
- **Expo Network Timeout:** Ensure computer and mobile device are connected to the exact same Wi-Fi network with local network sharing permitted in Windows Firewall.
