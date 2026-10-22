const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Helper: Days in a month
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// GET /api/payroll/calculate?month=YYYY-MM
// Live calculation of payroll based on attendance and advances
router.get('/calculate', async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const totalDaysInMonth = getDaysInMonth(year, monthNum);
    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-${String(totalDaysInMonth).padStart(2, '0')}`;

    // 1. Get all active employees
    const employeesRes = await pool.query(
      `SELECT * FROM employees WHERE status = 'active' ORDER BY employment_type ASC, name ASC`
    );
    const employees = employeesRes.rows;

    // 2. Get attendance aggregation for the month
    const attendanceRes = await pool.query(
      `SELECT 
        employee_id,
        COUNT(id) FILTER (WHERE status = 'present') AS present_days,
        COUNT(id) FILTER (WHERE status = 'half_day') AS half_days,
        COUNT(id) FILTER (WHERE status = 'absent') AS absent_days,
        COUNT(id) FILTER (WHERE status = 'paid_leave') AS paid_leaves,
        COALESCE(SUM(hours_worked), 0) AS total_hours_worked,
        COALESCE(SUM(overtime_hours), 0) AS total_overtime_hours
       FROM attendance
       WHERE date >= $1 AND date <= $2
       GROUP BY employee_id`,
      [startDate, endDate]
    );

    const attendanceMap = {};
    for (const row of attendanceRes.rows) {
      attendanceMap[row.employee_id] = row;
    }

    // 3. Get unsettled salary advances for each employee eligible for deduction in this month
    // Advances of type 'advance' adjust in next month's salary (deduction_month <= targetMonth)
    // Loans (type 'loan') have their own separate repayment flow and are not deducted in general monthly payroll
    const advancesRes = await pool.query(
      `SELECT 
        employee_id,
        COALESCE(SUM(amount - settled_amount), 0) AS total_unsettled_advance,
        COUNT(id) AS advance_count
       FROM advances
       WHERE COALESCE(type, 'advance') = 'advance'
         AND status != 'settled'
         AND (
           deduction_month <= $1
           OR (deduction_month IS NULL AND to_char(date + interval '1 month', 'YYYY-MM') <= $1)
         )
       GROUP BY employee_id`,
      [targetMonth]
    );

    const advancesMap = {};
    for (const row of advancesRes.rows) {
      advancesMap[row.employee_id] = parseFloat(row.total_unsettled_advance) || 0;
    }

    // 4. Get existing saved payroll records for this month if any
    const savedPayrollRes = await pool.query(
      `SELECT * FROM payroll_records WHERE month = $1`,
      [targetMonth]
    );
    const savedPayrollMap = {};
    for (const record of savedPayrollRes.rows) {
      savedPayrollMap[record.employee_id] = record;
    }

    // 5. Combine and calculate
    const payrollList = employees.map(emp => {
      const att = attendanceMap[emp.id] || {
        present_days: 0,
        half_days: 0,
        absent_days: 0,
        paid_leaves: 0,
        total_hours_worked: 0,
        total_overtime_hours: 0
      };

      const present = parseFloat(att.present_days) || 0;
      const half = parseFloat(att.half_days) || 0;
      const paidLeave = parseFloat(att.paid_leaves) || 0;
      const absent = parseFloat(att.absent_days) || 0;
      const effectiveWorkingDays = present + (half * 0.5) + paidLeave;
      const totalHours = parseFloat(att.total_hours_worked) || 0;
      const totalOT = parseFloat(att.total_overtime_hours) || 0;

      const baseRate = parseFloat(emp.base_salary) || 0;
      let grossSalary = 0;

      if (emp.employment_type === 'fixed') {
        // Daily rate = base_salary / days in month (or standard 30)
        // Gross = baseRate * (effectiveWorkingDays / totalDaysInMonth)
        // If effectiveWorkingDays > 0:
        grossSalary = totalDaysInMonth > 0 
          ? Math.round((baseRate / totalDaysInMonth) * effectiveWorkingDays) 
          : 0;
      } else {
        // Hourly: Total hours * rate per hour
        grossSalary = Math.round(totalHours * baseRate);
      }

      const availableAdvance = advancesMap[emp.id] || 0;
      const saved = savedPayrollMap[emp.id];

      // If already saved, use saved values for deductions & payment
      const advanceDeduction = saved 
        ? parseFloat(saved.advance_deduction) 
        : Math.min(grossSalary, availableAdvance);

      const bonusAllowance = saved ? parseFloat(saved.bonus_allowance) : 0;
      const otherDeductions = saved ? parseFloat(saved.other_deductions) : 0;
      const netSalary = Math.max(0, grossSalary - advanceDeduction + bonusAllowance - otherDeductions);
      const paidAmount = saved ? parseFloat(saved.paid_amount) : 0;
      const remainingSalary = Math.max(0, netSalary - paidAmount);
      const paymentStatus = saved ? saved.payment_status : (remainingSalary === 0 && grossSalary > 0 ? 'paid' : 'unpaid');

      return {
        id: saved ? saved.id : null,
        employee_id: emp.id,
        name: emp.name,
        phone: emp.phone,
        designation: emp.designation,
        employment_type: emp.employment_type,
        base_rate: baseRate,
        month_total_days: totalDaysInMonth,
        present_days: present,
        half_days: half,
        absent_days: absent,
        paid_leaves: paidLeave,
        effective_working_days: effectiveWorkingDays,
        total_hours_worked: totalHours,
        total_overtime_hours: totalOT,
        gross_salary: grossSalary,
        available_advance: availableAdvance,
        advance_deduction: advanceDeduction,
        bonus_allowance: bonusAllowance,
        other_deductions: otherDeductions,
        net_salary: netSalary,
        paid_amount: paidAmount,
        remaining_salary: remainingSalary,
        payment_status: paymentStatus,
        payment_date: saved ? saved.payment_date : null,
        payment_mode: saved ? saved.payment_mode : emp.payment_mode,
        payment_reference: saved ? saved.payment_reference : null,
        notes: saved ? saved.notes : '',
        is_saved: !!saved
      };
    });

    // Compute month totals
    const totals = payrollList.reduce((acc, item) => {
      acc.total_gross += item.gross_salary;
      acc.total_advance_deductions += item.advance_deduction;
      acc.total_bonus += item.bonus_allowance;
      acc.total_other_deductions += item.other_deductions;
      acc.total_net += item.net_salary;
      acc.total_paid += item.paid_amount;
      acc.total_remaining += item.remaining_salary;
      return acc;
    }, {
      total_gross: 0,
      total_advance_deductions: 0,
      total_bonus: 0,
      total_other_deductions: 0,
      total_net: 0,
      total_paid: 0,
      total_remaining: 0
    });

    res.json({
      month: targetMonth,
      totalDaysInMonth,
      payroll: payrollList,
      totals
    });
  } catch (err) {
    console.error('Calculate payroll error:', err);
    res.status(500).json({ error: 'Failed to calculate payroll.' });
  }
});

// POST /api/payroll/save - Save or update monthly payroll records
router.post('/save', async (req, res) => {
  const client = await pool.connect();
  try {
    const { month, records } = req.body;
    if (!month || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Month and payroll records are required.' });
    }

    await client.query('BEGIN');

    for (const item of records) {
      const {
        employee_id,
        employment_type,
        base_rate,
        month_total_days,
        present_days,
        half_days,
        absent_days,
        paid_leaves,
        total_working_days,
        total_hours_worked,
        gross_salary,
        advance_deduction = 0,
        bonus_allowance = 0,
        other_deductions = 0,
        net_salary,
        paid_amount = 0,
        remaining_salary,
        payment_status = 'unpaid',
        payment_date,
        payment_mode,
        payment_reference,
        notes
      } = item;

      // Upsert payroll record
      const upsertRes = await client.query(
        `INSERT INTO payroll_records (
          employee_id, month, employment_type, base_rate, month_total_days,
          present_days, half_days, absent_days, paid_leaves, total_working_days,
          total_hours_worked, gross_salary, advance_deduction, bonus_allowance,
          other_deductions, net_salary, paid_amount, remaining_salary,
          payment_status, payment_date, payment_mode, payment_reference, notes, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, CURRENT_TIMESTAMP
        )
        ON CONFLICT (employee_id, month)
        DO UPDATE SET
          base_rate = EXCLUDED.base_rate,
          month_total_days = EXCLUDED.month_total_days,
          present_days = EXCLUDED.present_days,
          half_days = EXCLUDED.half_days,
          absent_days = EXCLUDED.absent_days,
          paid_leaves = EXCLUDED.paid_leaves,
          total_working_days = EXCLUDED.total_working_days,
          total_hours_worked = EXCLUDED.total_hours_worked,
          gross_salary = EXCLUDED.gross_salary,
          advance_deduction = EXCLUDED.advance_deduction,
          bonus_allowance = EXCLUDED.bonus_allowance,
          other_deductions = EXCLUDED.other_deductions,
          net_salary = EXCLUDED.net_salary,
          paid_amount = EXCLUDED.paid_amount,
          remaining_salary = EXCLUDED.remaining_salary,
          payment_status = EXCLUDED.payment_status,
          payment_date = EXCLUDED.payment_date,
          payment_mode = EXCLUDED.payment_mode,
          payment_reference = EXCLUDED.payment_reference,
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [
          employee_id,
          month,
          employment_type,
          base_rate,
          month_total_days || 30,
          present_days || 0,
          half_days || 0,
          absent_days || 0,
          paid_leaves || 0,
          total_working_days || 0,
          total_hours_worked || 0,
          gross_salary,
          advance_deduction,
          bonus_allowance,
          other_deductions,
          net_salary,
          paid_amount,
          remaining_salary,
          payment_status,
          payment_date || (payment_status === 'paid' ? new Date().toISOString().split('T')[0] : null),
          payment_mode || 'Cash',
          payment_reference || null,
          notes || null
        ]
      );

      const payrollId = upsertRes.rows[0].id;

      // Handle advance deductions settlement if deduction > 0
      if (parseFloat(advance_deduction) > 0) {
        let deductionToAllocate = parseFloat(advance_deduction);

        // Fetch unsettled eligible salary advances for this employee in order of date
        const unsettledAdvances = await client.query(
          `SELECT id, amount, settled_amount FROM advances 
           WHERE employee_id = $1 
             AND COALESCE(type, 'advance') = 'advance'
             AND status != 'settled' 
             AND (
               deduction_month <= $2
               OR (deduction_month IS NULL AND to_char(date + interval '1 month', 'YYYY-MM') <= $2)
             )
           ORDER BY date ASC, id ASC`,
          [employee_id, month]
        );

        for (const adv of unsettledAdvances.rows) {
          if (deductionToAllocate <= 0) break;

          const currentSettled = parseFloat(adv.settled_amount);
          const advanceTotal = parseFloat(adv.amount);
          const remainingOnAdv = advanceTotal - currentSettled;

          const deductForThis = Math.min(remainingOnAdv, deductionToAllocate);
          const newSettled = currentSettled + deductForThis;
          const newStatus = newSettled >= advanceTotal ? 'settled' : 'partially_settled';

          await client.query(
            `UPDATE advances SET settled_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [newSettled, newStatus, adv.id]
          );

          await client.query(
            `INSERT INTO advance_deductions_log (payroll_id, advance_id, amount_deducted)
             VALUES ($1, $2, $3)`,
            [payrollId, adv.id, deductForThis]
          );

          deductionToAllocate -= deductForThis;
        }
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Payroll saved successfully', month });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save payroll error:', err);
    res.status(500).json({ error: 'Failed to save payroll records.' });
  } finally {
    client.release();
  }
});

// POST /api/payroll/record-payment - Record payment against a payroll record
router.post('/record-payment', async (req, res) => {
  try {
    const { payroll_id, payment_amount, payment_mode, payment_reference, notes } = req.body;
    if (!payroll_id || payment_amount === undefined) {
      return res.status(400).json({ error: 'Payroll ID and payment amount are required.' });
    }

    const payrollRes = await pool.query('SELECT * FROM payroll_records WHERE id = $1', [payroll_id]);
    if (payrollRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll record not found.' });
    }

    const pr = payrollRes.rows[0];
    const newPaidAmount = parseFloat(pr.paid_amount) + parseFloat(payment_amount);
    const netSalary = parseFloat(pr.net_salary);
    const remainingSalary = Math.max(0, netSalary - newPaidAmount);

    let paymentStatus = 'unpaid';
    if (newPaidAmount >= netSalary) {
      paymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'partially_paid';
    }

    const updated = await pool.query(
      `UPDATE payroll_records SET
        paid_amount = $1,
        remaining_salary = $2,
        payment_status = $3,
        payment_date = CURRENT_DATE,
        payment_mode = $4,
        payment_reference = $5,
        notes = COALESCE($6, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        newPaidAmount,
        remainingSalary,
        paymentStatus,
        payment_mode || pr.payment_mode || 'Cash',
        payment_reference || pr.payment_reference,
        notes || null,
        payroll_id
      ]
    );

    res.json({
      message: 'Payment recorded successfully',
      payroll: updated.rows[0]
    });
  } catch (err) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

// GET /api/payroll/slip/:id - Get full payslip details for printing
router.get('/slip/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        p.*,
        e.name,
        e.phone,
        e.designation,
        e.joining_date,
        e.payment_mode AS preferred_payment_mode,
        e.bank_details
       FROM payroll_records p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salary slip not found.' });
    }

    const slip = result.rows[0];

    // Get advance deductions details if any
    const deductionsRes = await pool.query(
      `SELECT adl.amount_deducted, a.date AS advance_date, a.reason
       FROM advance_deductions_log adl
       JOIN advances a ON adl.advance_id = a.id
       WHERE adl.payroll_id = $1`,
      [id]
    );

    res.json({
      slip,
      advancesDeducted: deductionsRes.rows
    });
  } catch (err) {
    console.error('Fetch payslip error:', err);
    res.status(500).json({ error: 'Failed to retrieve payslip details.' });
  }
});

module.exports = router;
