const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/attendance/by-date?date=YYYY-MM-DD
router.get('/by-date', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        e.id AS employee_id,
        e.name,
        e.designation,
        e.employment_type,
        e.base_salary,
        e.standard_hours_per_day,
        COALESCE(a.id, NULL) AS attendance_id,
        COALESCE(a.status, 'present') AS status,
        COALESCE(a.hours_worked, CASE WHEN e.employment_type = 'hourly' THEN e.standard_hours_per_day ELSE 8 END) AS hours_worked,
        COALESCE(a.overtime_hours, 0) AS overtime_hours,
        COALESCE(a.notes, '') AS notes,
        (a.id IS NOT NULL) AS is_marked
       FROM employees e
       LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
       WHERE e.status = 'active'
       ORDER BY e.employment_type ASC, e.name ASC`,
      [targetDate]
    );

    res.json({
      date: targetDate,
      attendance: result.rows
    });
  } catch (err) {
    console.error('Fetch attendance by date error:', err);
    res.status(500).json({ error: 'Failed to retrieve attendance records.' });
  }
});

// POST /api/attendance/bulk - Save attendance for multiple employees on a date
router.post('/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Date and records array are required.' });
    }

    await client.query('BEGIN');

    for (const item of records) {
      const {
        employee_id,
        status = 'present',
        hours_worked = 0,
        overtime_hours = 0,
        notes = ''
      } = item;

      await client.query(
        `INSERT INTO attendance (employee_id, date, status, hours_worked, overtime_hours, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (employee_id, date)
         DO UPDATE SET
           status = EXCLUDED.status,
           hours_worked = EXCLUDED.hours_worked,
           overtime_hours = EXCLUDED.overtime_hours,
           notes = EXCLUDED.notes,
           updated_at = CURRENT_TIMESTAMP`,
        [
          employee_id,
          date,
          status,
          parseFloat(hours_worked) || 0,
          parseFloat(overtime_hours) || 0,
          notes
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Attendance saved successfully', count: records.length, date });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk attendance error:', err);
    res.status(500).json({ error: 'Failed to record attendance.' });
  } finally {
    client.release();
  }
});

// GET /api/attendance/monthly-summary?month=YYYY-MM
router.get('/monthly-summary', async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    // Calculate total calendar days in month
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    // Query aggregated attendance for all active employees
    const result = await pool.query(
      `SELECT 
        e.id AS employee_id,
        e.name,
        e.designation,
        e.employment_type,
        e.base_salary,
        e.standard_hours_per_day,
        COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_days,
        COUNT(a.id) FILTER (WHERE a.status = 'half_day') AS half_days,
        COUNT(a.id) FILTER (WHERE a.status = 'absent') AS absent_days,
        COUNT(a.id) FILTER (WHERE a.status = 'paid_leave') AS paid_leaves,
        COALESCE(SUM(a.hours_worked), 0) AS total_hours_worked,
        COALESCE(SUM(a.overtime_hours), 0) AS total_overtime_hours
       FROM employees e
       LEFT JOIN attendance a ON e.id = a.employee_id 
         AND a.date >= $1 AND a.date <= $2
       WHERE e.status = 'active'
       GROUP BY e.id
       ORDER BY e.employment_type ASC, e.name ASC`,
      [`${targetMonth}-01`, `${targetMonth}-${String(totalDaysInMonth).padStart(2, '0')}`]
    );

    // Compute effective working days (Present + 0.5 * HalfDay + PaidLeave)
    const summary = result.rows.map(row => {
      const present = parseFloat(row.present_days) || 0;
      const half = parseFloat(row.half_days) || 0;
      const paidLeave = parseFloat(row.paid_leaves) || 0;
      const effectiveWorkingDays = present + (half * 0.5) + paidLeave;

      return {
        ...row,
        month: targetMonth,
        month_total_days: totalDaysInMonth,
        effective_working_days: effectiveWorkingDays
      };
    });

    res.json({
      month: targetMonth,
      totalDaysInMonth,
      summary
    });
  } catch (err) {
    console.error('Monthly attendance summary error:', err);
    res.status(500).json({ error: 'Failed to retrieve monthly attendance summary.' });
  }
});

module.exports = router;
