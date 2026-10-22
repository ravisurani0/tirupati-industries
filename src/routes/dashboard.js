const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // 1. Employee counts
    const empCountRes = await pool.query(`
      SELECT 
        COUNT(*) AS total_employees,
        COUNT(*) FILTER (WHERE status = 'active') AS active_employees,
        COUNT(*) FILTER (WHERE status = 'active' AND employment_type = 'fixed') AS fixed_count,
        COUNT(*) FILTER (WHERE status = 'active' AND employment_type = 'hourly') AS hourly_count
      FROM employees
    `);
    const empCounts = empCountRes.rows[0];

    // 2. Today's attendance status
    const todayAttRes = await pool.query(
      `SELECT 
        COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_today,
        COUNT(a.id) FILTER (WHERE a.status = 'half_day') AS half_day_today,
        COUNT(a.id) FILTER (WHERE a.status = 'absent') AS absent_today,
        COUNT(a.id) FILTER (WHERE a.status = 'paid_leave') AS paid_leave_today,
        COUNT(a.id) AS marked_total
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id AND e.status = 'active'
       WHERE a.date = $1`,
      [today]
    );
    const todayAtt = todayAttRes.rows[0];

    // 3. Advance and Loan financial summary
    const advanceRes = await pool.query(`
      SELECT 
        COALESCE(SUM(amount - settled_amount) FILTER (WHERE COALESCE(type, 'advance') = 'advance' AND status != 'settled'), 0) AS total_unsettled_advance,
        COALESCE(SUM(amount) FILTER (WHERE COALESCE(type, 'advance') = 'advance' AND date::text LIKE '${currentMonth}%'), 0) AS month_advance_given,
        COUNT(*) FILTER (WHERE COALESCE(type, 'advance') = 'advance' AND status != 'settled') AS unsettled_count,
        COUNT(*) FILTER (WHERE type = 'loan' AND status != 'settled') AS active_loans_count,
        COALESCE(SUM(amount) FILTER (WHERE type = 'loan'), 0) AS total_loan_principal,
        COALESCE(SUM(amount - settled_amount) FILTER (WHERE type = 'loan' AND status != 'settled'), 0) AS active_loan_balance
      FROM advances
    `);
    const advanceStats = advanceRes.rows[0];

    // 4. Current Month Payroll Status
    const payrollRes = await pool.query(
      `SELECT 
        COALESCE(SUM(gross_salary), 0) AS total_gross_salary,
        COALESCE(SUM(advance_deduction), 0) AS total_advance_deducted,
        COALESCE(SUM(net_salary), 0) AS total_net_salary,
        COALESCE(SUM(paid_amount), 0) AS total_paid_salary,
        COALESCE(SUM(remaining_salary), 0) AS total_remaining_salary,
        COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid_count,
        COUNT(*) FILTER (WHERE payment_status != 'paid') AS pending_count
       FROM payroll_records
       WHERE month = $1`,
      [currentMonth]
    );
    const payrollStats = payrollRes.rows[0];

    // 5. Recent advances and loans
    const recentAdvancesRes = await pool.query(`
      SELECT a.*, COALESCE(a.type, 'advance') AS type, e.name AS employee_name, e.designation, e.employment_type
      FROM advances a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.date DESC, a.id DESC
      LIMIT 6
    `);

    // 6. Recent employees
    const recentEmployeesRes = await pool.query(`
      SELECT id, name, designation, employment_type, base_salary, status, joining_date
      FROM employees
      ORDER BY id DESC
      LIMIT 5
    `);

    res.json({
      today,
      currentMonth,
      employeeCounts: empCounts,
      todayAttendance: {
        ...todayAtt,
        unmarked_today: Math.max(0, parseInt(empCounts.active_employees, 10) - parseInt(todayAtt.marked_total, 10))
      },
      advanceStats,
      payrollStats,
      recentAdvances: recentAdvancesRes.rows,
      recentEmployees: recentEmployeesRes.rows
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard stats.' });
  }
});

module.exports = router;
