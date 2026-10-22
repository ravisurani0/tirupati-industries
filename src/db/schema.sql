-- Tirupati Industries Workshop Employee & Payroll Schema

-- 1. Admin Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) DEFAULT 'Workshop Admin',
  role VARCHAR(20) DEFAULT 'admin',
  email VARCHAR(100),
  phone VARCHAR(20),
  workshop_name VARCHAR(150) DEFAULT 'Tirupati Industries',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS workshop_name VARCHAR(150) DEFAULT 'Tirupati Industries';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Employees Table
-- Type: 'fixed' (Monthly Fixed Salary based on working days)
--       'hourly' (Hourly Wage based on working hours)
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  designation VARCHAR(100) NOT NULL, -- e.g. "Lathe Machine Master", "Welder", "CNC Operator", "Helper"
  employment_type VARCHAR(20) NOT NULL DEFAULT 'fixed', -- 'fixed' or 'hourly'
  base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Monthly salary if fixed, or rate/hour if hourly
  standard_hours_per_day NUMERIC(4, 2) DEFAULT 8.0,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active' or 'inactive'
  payment_mode VARCHAR(30) DEFAULT 'Cash', -- 'Cash', 'Bank Transfer', 'UPI'
  bank_details TEXT, -- Account No / IFSC / UPI ID
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Daily Attendance & Hours Table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present', -- 'present', 'half_day', 'absent', 'paid_leave'
  hours_worked NUMERIC(5, 2) DEFAULT 0, -- Logged hours for hourly workers or daily shift
  overtime_hours NUMERIC(5, 2) DEFAULT 0,
  notes VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
);

-- 4. Advance & Loan Table
-- Type: 'advance' (Salary advance adjusted in next month salary)
--       'loan' (Staff loan with interest and multiple repayment installments)
CREATE TABLE IF NOT EXISTS advances (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'advance', -- 'advance' or 'loan'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL,
  deduction_month VARCHAR(7), -- 'YYYY-MM' for type 'advance' (next month salary)
  interest_rate NUMERIC(6, 2) DEFAULT 0, -- For loans: percentage rate
  interest_type VARCHAR(20) DEFAULT 'monthly', -- 'daily', 'monthly', 'yearly'
  reason VARCHAR(255),
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  status VARCHAR(20) DEFAULT 'unsettled', -- 'unsettled', 'settled', 'partially_settled'
  settled_amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE advances ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'advance';
ALTER TABLE advances ADD COLUMN IF NOT EXISTS deduction_month VARCHAR(7);
ALTER TABLE advances ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(6, 2) DEFAULT 0;
ALTER TABLE advances ADD COLUMN IF NOT EXISTS interest_type VARCHAR(20) DEFAULT 'monthly';

-- 5. Monthly Payroll Records Table
CREATE TABLE IF NOT EXISTS payroll_records (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  employment_type VARCHAR(20) NOT NULL,
  base_rate NUMERIC(12, 2) NOT NULL,
  month_total_days INTEGER DEFAULT 30,
  present_days NUMERIC(5, 2) DEFAULT 0,
  half_days NUMERIC(5, 2) DEFAULT 0,
  absent_days NUMERIC(5, 2) DEFAULT 0,
  paid_leaves NUMERIC(5, 2) DEFAULT 0,
  total_working_days NUMERIC(5, 2) DEFAULT 0,
  total_hours_worked NUMERIC(6, 2) DEFAULT 0,
  gross_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  advance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bonus_allowance NUMERIC(12, 2) DEFAULT 0,
  other_deductions NUMERIC(12, 2) DEFAULT 0,
  net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  remaining_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid'
  payment_date DATE,
  payment_mode VARCHAR(50),
  payment_reference VARCHAR(100),
  notes TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_employee_month UNIQUE (employee_id, month)
);

-- 6. Advance Deductions Mapping (links advances to payroll)
CREATE TABLE IF NOT EXISTS advance_deductions_log (
  id SERIAL PRIMARY KEY,
  payroll_id INTEGER NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
  advance_id INTEGER NOT NULL REFERENCES advances(id) ON DELETE CASCADE,
  amount_deducted NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Loan Repayments Table (Multiple repayment entries under a loan)
CREATE TABLE IF NOT EXISTS loan_repayments (
  id SERIAL PRIMARY KEY,
  advance_id INTEGER NOT NULL REFERENCES advances(id) ON DELETE CASCADE,
  repayment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL,
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  notes VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_advances_employee ON advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_date ON advances(date);
CREATE INDEX IF NOT EXISTS idx_advances_status ON advances(status);
CREATE INDEX IF NOT EXISTS idx_advances_type ON advances(type);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_advance ON loan_repayments(advance_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_date ON loan_repayments(repayment_date);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll_records(month);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll_records(employee_id);
