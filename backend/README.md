# EMS API

Express 5 · Knex · JWT · bcrypt · Multer (profile logo uploads) · express-validator

## Running

This folder has no `package.json` of its own. Install and run everything from the **project root** (see `../README.md`): `npm install`, `npm run setup`, `npm run dev`. The API is served at `http://localhost:5000/api` on the same port as the React app.

## Database

Connection is chosen in `knexfile.js`:
1. `DATABASE_URL` set → **Postgres** (Neon etc.). `sslmode`/`channel_binding` are translated into a verified TLS connection for node-postgres.
2. otherwise `DB_CLIENT=sqlite` (default) → `database/ems.sqlite`
3. or `DB_CLIENT=mysql2` / `pg` with the individual `DB_*` settings.


**employees**: `id (UUID), first_name, last_name, mobile_number, address, email, joining_date (DATE), payroll_type (monthly_fixed|hourly), monthly_salary NUMERIC(14,2), hourly_rate NUMERIC(14,2), fixed_working_hours NUMERIC(5,2), notes, is_active, created_at, updated_at (timestamptz)`

**attendance**: `id (UUID), employee_id → employees.id (cascade delete), attendance_date (DATE), standard_hours, actual_hours NUMERIC(5,2), attendance_status (present|absent|leave|holiday|off), notes, created_by/updated_by → users.id (NULL = daily job), created_at, updated_at`. Unique per `(employee_id, attendance_date)`.

**accounts**: `id (UUID), title, description, account_number, initial_amount NUMERIC(14,2), is_active, is_default (pre-selected for everyday entries; only one), created_by/updated_by → users.id, created_at, updated_at`. Balance is calculated: `initial_amount + credits − debits`.

**expenses**: `id (UUID), account_id → accounts.id (RESTRICT), title, description, amount NUMERIC(14,2), transaction_type (debit|credit), expense_date (DATE), bill_number, bill_image (uploads/bills/...), transaction_by → users.id (the signed-in user), updated_by, created_at, updated_at`

**expense_categories**: `id (UUID), title (unique), description, is_active, created_by/updated_by, created_at, updated_at`. `expenses.category_id` → expense_categories.id (nullable = uncategorized; RESTRICT on delete).

**salary_advances**: `id (UUID), employee_id → employees.id (RESTRICT), account_id → accounts.id (optional), amount, transfer_date, description, recover_from_salary, repay_from_salary, is_loan, interest_rate (% per year), tenure_months, interest_amount, total_repayable, monthly_installment, repayment_start_month (YYYY-MM), recovered_amount, status (open|settled), created_by/updated_by, created_at, updated_at`. Advances are debits on the linked account's balance.

**roles**: `id, name, slug (unique), description, created_at, updated_at`

**users**: `id, first_name, last_name, email (unique), phone, address, profile_logo, password (bcrypt), role_id → roles.id, is_active, last_login_at, created_at, updated_at`

Seeders (both are safe to re-run):

- `01_roles.js`: **Admin** (`admin`) and **Manager** (`manager`)
- `02_admin_user.js`: **admin@mail.com / password** with the `admin` role. Values come from the `ADMIN_*` keys in `.env`.

Self-registered users get the `manager` role by default (`defaultRoleSlug` in `src/config/index.js`).

## Endpoints

All responses look like `{ success, message, data, meta? }`. Errors look like `{ success: false, message, errors?: [{ field, message }] }`. Send the token as `Authorization: Bearer <token>`.

### Auth (`/api/auth`)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/login` | – | `email, password, remember?` → `{ token, user }` (`remember` gives a 30-day token) |
| POST | `/register` | optional | multipart or JSON: `first_name, last_name, email, phone?, address?, password, password_confirmation?, profile_logo? (file), role_id?` |
| GET | `/me` | ✓ | – |
| PUT | `/profile` | ✓ | multipart: any of `first_name, last_name, email, phone, address, profile_logo (file), remove_profile_logo` |
| PUT | `/change-password` | ✓ | `current_password, password, password_confirmation` |
| POST | `/logout` | ✓ | – |

`role_id` on `/register` only takes effect when the caller is a signed-in **admin**. Public sign-ups always get the default role, and an admin registering someone does not get a token back.

### Roles (`/api/roles`)
`GET /` and `GET /:id` work for any signed-in user. `POST /` (`name, slug?, description?`), `PUT /:id` and `DELETE /:id` are admin only. The system roles (admin and manager), and any role that still has users, cannot be deleted.

### Users (`/api/users`): admin only
`GET /?page=&per_page=&search=&role_id=`, `GET /stats`, `GET /:id`, `POST /` (all register fields + `role_id`, `is_active`), `PUT /:id`, `DELETE /:id`. Admins cannot delete or deactivate themselves, or change their own role.

### Employees (`/api/employees`): admin and manager
| Method | Path | Notes |
|---|---|---|
| GET | `/?page=&per_page=&search=&status=active\|inactive&payroll_type=` | Paginated list; search covers name, mobile and email |
| GET | `/stats` | `{ total_employees, active_employees }` |
| GET | `/:id` | `id` is a UUID |
| POST | `/` | JSON body, see below |
| PUT | `/:id` | Same body as POST (full update) |
| DELETE | `/:id` | |

Required: `first_name`, `last_name`, `mobile_number`, `payroll_type` (`monthly_fixed` or `hourly`), `monthly_salary`, `hourly_rate` (>= 0, up to 2 decimals), `is_active`.
Optional: `email`, `address`, `joining_date` (`YYYY-MM-DD`), `fixed_working_hours` (0-24), `notes`.

### Attendance (`/api/attendance`): admin and manager
| Method | Path | Notes |
|---|---|---|
| GET | `/daily?date=&status=&payroll_type=&search=` | Day sheet: every active employee with their entry or `null`; `meta.summary` has counts per status (+ `not_marked`). `status=not_marked` lists employees without an entry |
| GET | `/calendar?month=YYYY-MM&employee_id=&status=&payroll_type=` | Month view: `days` = `{ 'YYYY-MM-DD': [{ id, employee_id, name, attendance_status, actual_hours, ... }] }`, plus `totals` per status |
| GET | `/?from=&to=&employee_id=&status=` | Entries, newest first |
| GET | `/:id` | |
| POST | `/` | `employee_id, attendance_date, attendance_status, standard_hours?, actual_hours?, notes?` → 409 if that day already has an entry |
| PUT | `/:id` | `attendance_status?, standard_hours?, actual_hours?, notes?` (changing status without hours resets actual hours: present = standard, otherwise 0) |
| DELETE | `/:id` | |
| POST | `/generate` | **Admin.** `{ date? }` runs the daily job now |

**Daily job:** creates a `present` entry (standard = actual = the employee's fixed working hours, or `ATTENDANCE_DEFAULT_HOURS`) for every **active, monthly-fixed** employee who has joined by that date and has no entry yet. **Hourly employees are never auto-created**; with no entry they count as absent until an admin adds one. To record an absence for a fixed-salary employee, change the status of their auto entry to `absent`.
- Runs inside the server every day at `ATTENDANCE_JOB_TIME` (default **08:30**, `APP_TIMEZONE`), plus a catch-up for today at startup. Set `ATTENDANCE_JOB_ENABLED=false` to turn it off.
- From cron instead: `npm run attendance:daily` (today) or `npm run attendance:daily -- --date=2026-10-24`.
- Safe to run repeatedly (unique key). `ATTENDANCE_WEEKLY_OFF=0` skips Sundays.

### Accounts (`/api/accounts`): read = admin and manager · write = admin
| Method | Path | Notes |
|---|---|---|
| GET | `/?search=&status=active\|inactive` | Each item includes `current_balance`, `total_credits`, `total_debits`, `transactions_count` |
| GET | `/:id` | Same fields, plus `total_advances` (advances + loans paid, included in `total_debits`) |
| GET | `/:id/transactions?source=expense\|advance\|loan` | Ledger: expenses and advances/loans paid from the account, newest first, each with `balance_after`; `meta.counts` per source |
| POST / PUT | `/`, `/:id` | `title*, initial_amount*, description?, account_number?, is_active?, is_default?` (setting a default clears the previous one; inactive accounts can't be default) |
| DELETE | `/:id` | 409 if the account has transactions (mark it inactive instead) |

Balances are worked out in `account.service.js → totalsFor()`; when the salary module is added, its payments are added there as another debit source.

### Daily Expenses (`/api/expenses`): admin and manager
| Method | Path | Notes |
|---|---|---|
| GET | `/?from=&to=&account_id=&category_id=<uuid>\|none&type=debit\|credit&search=` | Paginated; `meta.summary` = `{ total_credits, total_debits, net }` for the same filters |
| GET | `/:id` | Includes `account`, `transaction_by`, `bill_image_url` |
| POST | `/` | multipart: `title*, amount* (> 0), transaction_type*, account_id*, expense_date*, category_id? (active category), description?, bill_number?, bill_image? (JPG/PNG/WEBP/PDF, max 5 MB)`. `transaction_by` is always the signed-in user; the account must be active |
| PUT | `/:id` | Same fields; a new `bill_image` replaces the old file, `remove_bill_image=true` clears it |
| DELETE | `/:id` | Also deletes the bill file |

### Expense categories (`/api/expense-categories`): admin and manager
`GET /?search=&status=active|inactive` (each item has `expenses_count`, `total_debits`), `GET /:id`, `POST /` and `PUT /:id` (`title*` (unique), `description?`, `is_active?`), `DELETE /:id` (409 if any expense uses it; mark it inactive instead).

### Advances & loans (`/api/advances`): admin only
| Method | Path | Notes |
|---|---|---|
| GET | `/?employee_id=&type=advance\|loan&status=open\|settled&from=&to=&search=` | Paginated; `meta.summary` = `{ total_given, total_interest, total_outstanding }` |
| GET | `/:id` | Includes `schedule`: `[{ number, month, amount, balance_after }]` |
| POST / PUT | `/`, `/:id` | `employee_id*, amount* (> 0), transfer_date*, account_id?, description?, recover_from_salary?, repay_from_salary?, is_loan?`; when `is_loan` is true, `interest_rate*` (0-100) and `tenure_months*` (1-360) are required. `created_by` = signed-in user |
| DELETE | `/:id` | Only while nothing has been recovered |

**Calculation** (`advance.service.js → calculate()`):
- **Advance** (`is_loan=false`): no interest; recovered in full from the salary of the transfer month.
- **Loan** (`is_loan=true`): simple interest **per year**: `interest = amount × rate% × months / 12`, `total = amount + interest`, `installment = total / months` (last installment absorbs rounding), starting the month after the transfer.
- Only one flag applies per type: advances use `recover_from_salary`, loans use `repay_from_salary`; the other is always saved as `false`. When the flag is off, the employee pays back outside payroll.
- `recovered_amount` / `status` are for the salary module to update when deductions are made.

### Payroll (`/api/payroll`): admin only, calculated live (nothing stored)
| Method | Path | Notes |
|---|---|---|
| GET | `/?month=YYYY-MM&payroll_type=&search=` | Every active employee (plus anyone with attendance that month): `basis`, `attendance` counts, `gross_earned`, `deductions[]`, `net_payable`, `carry_forward`; `meta.period` (`asOf` = today for the current month) and `meta.totals` |
| GET | `/:employeeId?month=YYYY-MM` | Same breakdown plus the month's attendance entries and all the employee's advances/loans |

Rules (`payroll.service.js`):
- **Fixed:** `per_day = monthly_salary / days_in_month`; period = 1st (or joining date) → today / month end; `earned = per_day × (period days − absent − leave)`. Holiday, off and unmarked days are paid.
- **Hourly:** `earned = Σ actual_hours × hourly_rate` for the period.
- **Deductions:** open advances with `recover_from_salary` due this month or earlier (full outstanding) + this month's installment of open loans with `repay_from_salary`.
- `net_payable = max(0, earned − deductions)`; any shortfall is `carry_forward`.

### Other
`GET /api/health` reports API and database status. Unknown `/api/*` routes return a JSON 404. Uploaded logos are served from `/uploads/profile/...`, and `profile_logo_url` is root-relative; set `ASSET_BASE_URL` to make it absolute (JPG/PNG/WEBP/GIF/SVG, max 2 MB).

## Quick test

```bash
curl -s -X POST localhost:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@mail.com","password":"password"}'

curl -s -X POST localhost:5000/api/users -H "Authorization: Bearer $TOKEN" \
  -F first_name=Priya -F last_name=Shah -F email=priya@mail.com -F phone=9876543210 \
  -F address="Ahmedabad" -F password=secret123 -F role_id=2 -F profile_logo=@avatar.png
```
