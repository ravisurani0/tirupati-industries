const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Helper to escape CSV values
function toCSVCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/export/payroll?month=YYYY-MM
router.get('/payroll', async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const result = await pool.query(
      `SELECT 
        e.name,
        e.designation,
        p.employment_type,
        p.base_rate,
        p.month_total_days,
        p.present_days,
        p.half_days,
        p.absent_days,
        p.paid_leaves,
        p.total_working_days,
        p.total_hours_worked,
        p.gross_salary,
        p.advance_deduction,
        p.bonus_allowance,
        p.other_deductions,
        p.net_salary,
        p.paid_amount,
        p.remaining_salary,
        p.payment_status,
        p.payment_date,
        p.payment_mode
       FROM payroll_records p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.month = $1
       ORDER BY p.employment_type ASC, e.name ASC`,
      [targetMonth]
    );

    const headers = [
      'Employee Name', 'Designation', 'Type', 'Base Rate (₹)', 'Month Total Days',
      'Present Days', 'Half Days', 'Absent Days', 'Paid Leaves', 'Total Working Days',
      'Total Hours Worked', 'Gross Salary (₹)', 'Advance Deducted (₹)', 'Bonus (₹)',
      'Other Deductions (₹)', 'Net Payable (₹)', 'Paid Amount (₹)', 'Remaining Balance (₹)',
      'Payment Status', 'Payment Date', 'Payment Mode'
    ];

    let csvContent = headers.join(',') + '\n';

    for (const row of result.rows) {
      const line = [
        toCSVCell(row.name),
        toCSVCell(row.designation),
        toCSVCell(row.employment_type === 'fixed' ? 'Fixed Salary' : 'Hourly Wage'),
        toCSVCell(row.base_rate),
        toCSVCell(row.month_total_days),
        toCSVCell(row.present_days),
        toCSVCell(row.half_days),
        toCSVCell(row.absent_days),
        toCSVCell(row.paid_leaves),
        toCSVCell(row.total_working_days),
        toCSVCell(row.total_hours_worked),
        toCSVCell(row.gross_salary),
        toCSVCell(row.advance_deduction),
        toCSVCell(row.bonus_allowance),
        toCSVCell(row.other_deductions),
        toCSVCell(row.net_salary),
        toCSVCell(row.paid_amount),
        toCSVCell(row.remaining_salary),
        toCSVCell(row.payment_status.toUpperCase()),
        toCSVCell(row.payment_date || ''),
        toCSVCell(row.payment_mode || '')
      ].join(',');
      csvContent += line + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Tirupati_Payroll_${targetMonth}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export payroll CSV error:', err);
    res.status(500).json({ error: 'Failed to export payroll report.' });
  }
});

// GET /api/export/advances
router.get('/advances', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        a.id,
        e.name AS employee_name,
        e.designation,
        a.date,
        a.amount,
        a.settled_amount,
        (a.amount - a.settled_amount) AS remaining_unsettled,
        a.reason,
        a.payment_mode,
        a.status
      FROM advances a
      JOIN employees e ON a.employee_id = e.id
    `;
    const params = [];
    if (status && status !== 'all') {
      params.push(status);
      query += ` WHERE a.status = $1`;
    }
    query += ` ORDER BY a.date DESC, a.id DESC`;

    const result = await pool.query(query, params);

    const headers = [
      'Advance ID', 'Employee Name', 'Designation', 'Advance Date',
      'Total Advance (₹)', 'Settled (₹)', 'Remaining Unsettled (₹)',
      'Reason / Note', 'Disbursement Mode', 'Status'
    ];

    let csvContent = headers.join(',') + '\n';
    for (const r of result.rows) {
      const line = [
        toCSVCell(r.id),
        toCSVCell(r.employee_name),
        toCSVCell(r.designation),
        toCSVCell(r.date.toISOString().split('T')[0]),
        toCSVCell(r.amount),
        toCSVCell(r.settled_amount),
        toCSVCell(r.remaining_unsettled),
        toCSVCell(r.reason),
        toCSVCell(r.payment_mode),
        toCSVCell(r.status.toUpperCase())
      ].join(',');
      csvContent += line + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Tirupati_Advances_Report.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export advances CSV error:', err);
    res.status(500).json({ error: 'Failed to export advances report.' });
  }
});

module.exports = router;
