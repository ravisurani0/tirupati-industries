const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/employees - list employees with unsettled advance balance
router.get('/', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query = `
      SELECT 
        e.*,
        COALESCE(SUM(a.amount - a.settled_amount) FILTER (WHERE a.status != 'settled'), 0) AS unsettled_advance_total,
        COUNT(a.id) FILTER (WHERE a.status != 'settled') AS unsettled_advance_count
      FROM employees e
      LEFT JOIN advances a ON e.id = a.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }

    if (type && type !== 'all') {
      params.push(type);
      query += ` AND e.employment_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (e.name ILIKE $${params.length} OR e.designation ILIKE $${params.length} OR e.phone ILIKE $${params.length})`;
    }

    query += ` GROUP BY e.id ORDER BY e.status ASC, e.name ASC`;

    const result = await pool.query(query, params);
    res.json({ employees: result.rows });
  } catch (err) {
    console.error('Fetch employees error:', err);
    res.status(500).json({ error: 'Failed to retrieve employees.' });
  }
});

// GET /api/employees/:id - get single employee with advance and attendance summary
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const empResult = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employee = empResult.rows[0];

    // Advances history
    const advancesResult = await pool.query(
      'SELECT * FROM advances WHERE employee_id = $1 ORDER BY date DESC, id DESC LIMIT 20',
      [id]
    );

    // Recent attendance
    const attendanceResult = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 31',
      [id]
    );

    // Recent payroll history
    const payrollResult = await pool.query(
      'SELECT * FROM payroll_records WHERE employee_id = $1 ORDER BY month DESC LIMIT 12',
      [id]
    );

    // Totals
    const advanceTotals = await pool.query(
      `SELECT 
         COALESCE(SUM(amount), 0) AS total_advance_taken,
         COALESCE(SUM(amount - settled_amount) FILTER (WHERE status != 'settled'), 0) AS current_unsettled_advance
       FROM advances WHERE employee_id = $1`,
      [id]
    );

    res.json({
      employee,
      advances: advancesResult.rows,
      recentAttendance: attendanceResult.rows,
      payrollHistory: payrollResult.rows,
      summary: advanceTotals.rows[0]
    });
  } catch (err) {
    console.error('Fetch employee detail error:', err);
    res.status(500).json({ error: 'Failed to retrieve employee details.' });
  }
});

// POST /api/employees - add new employee
router.post('/', async (req, res) => {
  try {
    const {
      name,
      phone,
      designation,
      employment_type,
      base_salary,
      standard_hours_per_day,
      joining_date,
      status,
      payment_mode,
      bank_details,
      notes
    } = req.body;

    if (!name || !designation || !employment_type || base_salary === undefined) {
      return res.status(400).json({ error: 'Name, designation, employment type, and salary rate are required.' });
    }

    if (!['fixed', 'hourly'].includes(employment_type)) {
      return res.status(400).json({ error: 'Employment type must be either "fixed" or "hourly".' });
    }

    const parsedSalary = parseFloat(base_salary);
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      return res.status(400).json({ error: 'Valid base salary or hourly rate is required.' });
    }

    const result = await pool.query(
      `INSERT INTO employees (
        name, phone, designation, employment_type, base_salary, 
        standard_hours_per_day, joining_date, status, payment_mode, bank_details, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name.trim(),
        phone ? phone.trim() : null,
        designation.trim(),
        employment_type,
        parsedSalary,
        parseFloat(standard_hours_per_day) || 8.0,
        joining_date || new Date().toISOString().split('T')[0],
        status || 'active',
        payment_mode || 'Cash',
        bank_details ? bank_details.trim() : null,
        notes ? notes.trim() : null
      ]
    );

    res.status(201).json({
      message: 'Employee added successfully',
      employee: result.rows[0]
    });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Failed to create employee.' });
  }
});

// PUT /api/employees/:id - update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      designation,
      employment_type,
      base_salary,
      standard_hours_per_day,
      joining_date,
      status,
      payment_mode,
      bank_details,
      notes
    } = req.body;

    if (!name || !designation || !employment_type || base_salary === undefined) {
      return res.status(400).json({ error: 'Name, designation, employment type, and salary rate are required.' });
    }

    const parsedSalary = parseFloat(base_salary);
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      return res.status(400).json({ error: 'Valid base salary or hourly rate is required.' });
    }

    const result = await pool.query(
      `UPDATE employees SET
        name = $1,
        phone = $2,
        designation = $3,
        employment_type = $4,
        base_salary = $5,
        standard_hours_per_day = $6,
        joining_date = $7,
        status = $8,
        payment_mode = $9,
        bank_details = $10,
        notes = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        name.trim(),
        phone ? phone.trim() : null,
        designation.trim(),
        employment_type,
        parsedSalary,
        parseFloat(standard_hours_per_day) || 8.0,
        joining_date,
        status || 'active',
        payment_mode || 'Cash',
        bank_details ? bank_details.trim() : null,
        notes ? notes.trim() : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    res.json({
      message: 'Employee updated successfully',
      employee: result.rows[0]
    });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Failed to update employee.' });
  }
});

// DELETE /api/employees/:id - toggle status or delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if employee has payroll or advance records
    const checkRecords = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM payroll_records WHERE employee_id = $1) AS payroll_count,
        (SELECT COUNT(*) FROM advances WHERE employee_id = $1) AS advance_count`,
      [id]
    );

    const { payroll_count, advance_count } = checkRecords.rows[0];

    // If records exist, mark as inactive to preserve financial audit history
    if (parseInt(payroll_count, 10) > 0 || parseInt(advance_count, 10) > 0) {
      await pool.query(
        "UPDATE employees SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      return res.json({
        message: 'Employee marked as inactive to preserve financial and payroll history.',
        deactivated: true
      });
    }

    // Otherwise, can safely delete
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ message: 'Employee deleted successfully.', deleted: true });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'Failed to delete employee.' });
  }
});

module.exports = router;
