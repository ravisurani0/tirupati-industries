# 🏭 Tirupati Industries - Workshop Employee & Payroll Management System

A production-ready, full-stack Node.js & PostgreSQL web application tailored for industrial workshops, fabrication units, and manufacturing plants (designed for **Tirupati Industries, Rajkot**).

It manages staff with both **Fixed Monthly Wages** and **Hourly Wages**, tracks daily attendance and shift hours, disburses worker advance salary, calculates monthly gross pay, auto-deducts unsettled advances, tracks net remaining salary, and generates printable payslips and CSV audit reports.

---

## ✨ Key Features

1. **📊 Workshop Dashboard ("Simple Board")**
   - Real-time KPIs: Active staff (Fixed vs Hourly split), today's attendance count, outstanding advances, and net remaining salary to pay.
   - Quick action controls: Add staff, issue advance, log attendance, and compute payroll in 1 click.
   - Side-by-side live tables: Today's attendance status and recent advance salary disbursements.

2. **👥 Employee Management (Fixed & Hourly Support)**
   - **Fixed Monthly Salary Workers**: Base monthly pay calculated against effective working days (Present + 0.5 × Half-Day + Paid Leave).
   - **Hourly Wage Workers**: Salary calculated dynamically based on logged working hours (`Hours Worked × Hourly Rate`).
   - Profile & financial ledger: View each worker's complete history of advances, attendance, and past salary settlements.
   - Bank/UPI details and contact management.

3. **📅 Daily Attendance & Working Days Log**
   - Interactive daily log sheet with status options: `Present (1.0)`, `Half-Day (0.5)`, `Absent (0.0)`, and `Paid Leave (1.0)`.
   - Hourly work logging and overtime hours input per employee.
   - "Quick Set: All Present" one-click button.
   - Monthly cumulative working days and hours summary table.

4. **💰 Advance Salary Management**
   - Issue advances with purpose/notes (Medical, Festival, Emergency, Room rent, etc.) and payment mode (Cash, UPI, Bank).
   - Real-time tracking of unsettled balance per employee.
   - Advance status indicators: `Unsettled`, `Partially Settled`, and `Fully Settled`.

5. **📑 Monthly Payroll & Remaining Salary Report**
   - Select any month (e.g., `2026-10`) to calculate live workshop wages.
   - Clear formula breakdown:
     - **Gross Salary**:
       - Fixed: `round((Monthly Base Pay / Days in Month) × Working Days)`
       - Hourly: `round(Total Logged Hours × Hourly Rate)`
     - **Advance Deductions**: Automatically calculates available unsettled advance with manual override option.
     - **Bonus / Incentives (+)** and **Other Deductions (-)**.
     - **Net Payable Salary** = `Gross - Advance Deductions + Bonus - Other Deductions`.
     - **Remaining Salary** = `Net Payable - Paid Amount`.
   - **Record Payment Modal**: Enter payment amount, mode (Cash, UPI, NEFT), and transaction reference to settle balances.
   - **Printable Salary Slip**: Generates an official payment voucher with Tirupati Industries Rajkot header and signature lines for worker and employer.

6. **📥 CSV Reports & Audit Exports**
   - Monthly Payroll Sheet CSV.
   - Advance Salary Ledger CSV.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (with connection pooling and SSL auto-detection for cloud providers)
- **Authentication**: JWT & secure HTTP-only cookies, password hashing with `bcryptjs`
- **Frontend**: Clean Vanilla CSS design system (responsive, modern slate & amber industrial aesthetic, Inter typography)
- **Deployment**: Native support for **Render** (Node Web Service + Render Postgres) and **Vercel** (`vercel.json`)

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd tirupati.industries.rajkot
npm install
```

### 2. Configure Environment (`.env`)
Create a `.env` file in the project root (or copy `.env.example`):
```env
PORT=3000
DATABASE_URL=postgres://localhost:5432/tirupati_workshop
JWT_SECRET=super_secret_jwt_key_tirupati_industries
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
NODE_ENV=development
```

### 3. Run Migrations & Seed Sample Data
```bash
# Verify database schema & tables
npm run migrate

# Seed initial admin account and realistic workshop staff
npm run seed
```

### 4. Start the Application
```bash
# Standard start
npm start

# Or with live watch
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

**Default Admin Credentials:**
- **Username**: `admin`
- **Password**: `admin123`
*(A 1-click Auto-fill button is also provided on the login page)*

---

## ☁️ Deployment Instructions

### Option 1: Deploying to Render (Recommended)

1. **Push to GitHub**: Push this repository to your GitHub account.
2. **Create a PostgreSQL Database on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** > **PostgreSQL**.
   - Name it `tirupati-workshop-db` and select the Free or Starter plan.
   - Copy the **Internal Database URL** (or External Database URL).
3. **Create a Web Service on Render**:
   - Click **New +** > **Web Service**.
   - Connect your GitHub repository.
   - Select **Node** environment.
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Add Environment Variables in Render**:
   - `DATABASE_URL`: *(paste the Postgres connection URL copied from step 2)*
   - `JWT_SECRET`: *(enter any secure random string)*
   - `ADMIN_USER`: `admin`
   - `ADMIN_PASSWORD`: `admin123`
   - `NODE_ENV`: `production`
5. **Click "Create Web Service"**:
   - The server boots and automatically executes `runMigrations()` and `seedData()` on launch!
   - Your web app is live at `https://your-app-name.onrender.com`.

---

### Option 2: Deploying to Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Connect a PostgreSQL database (e.g., **Neon Serverless Postgres**, **Supabase**, or **Render Postgres**).
4. In Vercel Project Settings > **Environment Variables**, add:
   - `DATABASE_URL`: `postgres://user:password@host:5432/dbname?sslmode=require`
   - `JWT_SECRET`: `your_random_secret_string`
   - `ADMIN_USER`: `admin`
   - `ADMIN_PASSWORD`: `admin123`
   - `NODE_ENV`: `production`
5. Deploy! Vercel automatically uses `vercel.json` and routes requests through `api/index.js`.

---

## 📂 Project Structure

```
tirupati.industries.rajkot/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── package.json              # Project scripts and dependencies
├── server.js                 # Express server entry point & startup migrations
├── vercel.json               # Vercel serverless deployment config
├── api/
│   └── index.js              # Serverless entry point for Vercel
├── src/
│   ├── config/
│   │   └── db.js             # PostgreSQL connection pool with SSL detection
│   ├── db/
│   │   ├── schema.sql        # Table definitions, constraints & indexes
│   │   ├── migrate.js        # Migration runner script
│   │   └── seed.js           # Default admin & workshop sample data seeder
│   ├── middleware/
│   │   └── auth.js           # JWT authentication & session verification
│   └── routes/
│       ├── auth.js           # Login, logout, session check & password change
│       ├── employees.js      # Employee CRUD, profiles, rate & advance stats
│       ├── attendance.js     # Daily attendance sheet, bulk log & monthly summary
│       ├── advances.js       # Issue advance, repayment ledger & summary KPIs
│       ├── payroll.js        # Live wage calculation, advance deduction, pay & slip
│       ├── dashboard.js      # Dashboard stats & recent activity
│       └── export.js         # CSV exports for payroll and advances
└── public/
    ├── index.html            # Main workshop management interface
    ├── login.html            # Admin login screen with demo credentials
    ├── css/
    │   └── style.css         # Modern industrial design system & print styles
    └── js/
        ├── auth.js           # Client auth helper
        └── app.js            # UI state, attendance, advance & payroll handlers
```

---

## 🔒 Security & Best Practices

- Passwords securely hashed with `bcryptjs` (salt rounds: 10).
- Session tokens signed with JWT and stored in HTTP-only cookies and local storage.
- SQL parameterized queries throughout to prevent SQL injection.
- Soft deactivation for staff with historical financial records to maintain audit trails.
- Automatic SSL connection configuration for cloud databases.

---

© 2026 Tirupati Industries, Rajkot. All rights reserved.
