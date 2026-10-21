const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/advances - list advances with filters
router.get('/', async (req, res) => {
  try {
    const { employee_id, status, month, search } = req.query;
    let query = `
      SELECT 
        a.*,
        e.name AS employee_name,
        e.designation AS employee_designation,
        e.employment_type,
        e.phone AS employee_phone,
        (a.amount - a.settled_amount) AS remaining_advance
      FROM advances a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      params.push(employee_id);
      query += ` AND a.employee_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }

    if (month) {
      // YYYY-MM
      params.push(`${month}%`);
      query += ` AND a.date::text LIKE $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (e.name ILIKE $${params.length} OR a.reason ILIKE $${params.length})`;
    }

    query += ` ORDER BY a.date DESC, a.id DESC`;

    const result = await pool.query(query, params);
    res.json({ advances: result.rows });
  } catch (err) {
    console.error('Fetch advances error:', err);
    res.status(500).json({ error: 'Failed to retrieve advance records.' });
  }
});

// GET /api/advances/summary - KPI numbers for advances
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalStats = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_all_time,
        COALESCE(SUM(amount - settled_amount) FILTER (WHERE status != 'settled'), 0) AS total_unsettled,
        COALESCE(SUM(amount) FILTER (WHERE date::text LIKE '${currentMonth}%'), 0) AS current_month_given,
        COUNT(*) FILTER (WHERE status != 'settled') AS count_unsettled
      FROM advances
    `);

    res.json({
      currentMonth,
      stats: totalStats.rows[0]
    });
  } catch (err) {
    console.error('Advance summary error:', err);
    res.status(500).json({ error: 'Failed to retrieve advance summary stats.' });
  }
});

// POST /api/advances - record a new advance
router.post('/', async (req, res) => {
  try {
    const { employee_id, date, amount, reason, payment_mode } = req.body;

    if (!employee_id || !amount) {
      return res.status(400).json({ error: 'Employee and advance amount are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive advance amount is required.' });
    }

    const empCheck = await pool.query('SELECT name FROM employees WHERE id = $1', [employee_id]);
    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Selected employee does not exist.' });
    }

    const advanceDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO advances (employee_id, date, amount, reason, payment_mode, status, settled_amount)
       VALUES ($1, $2, $3, $4, $5, 'unsettled', 0)
       RETURNING *`,
      [
        employee_id,
        advanceDate,
        parsedAmount,
        reason ? reason.trim() : 'Personal advance',
        payment_mode || 'Cash'
      ]
    );

    res.status(201).json({
      message: 'Advance recorded successfully',
      advance: result.rows[0],
      employeeName: empCheck.rows[0].name
    });
  } catch (err) {
    console.error('Create advance error:', err);
    res.status(500).json({ error: 'Failed to record advance.' });
  }
});

// PUT /api/advances/:id - update an advance
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, reason, payment_mode, status } = req.body;

    const existing = await pool.query('SELECT * FROM advances WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Advance record not found.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive advance amount is required.' });
    }

    const currentRecord = existing.rows[0];
    let newStatus = status || currentRecord.status;
    let settled = parseFloat(currentRecord.settled_amount);
    if (settled >= parsedAmount) {
      newStatus = 'settled';
    }

    const result = await pool.query(
      `UPDATE advances SET
        date = $1,
        amount = $2,
        reason = $3,
        payment_mode = $4,
        status = $5,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        date || currentRecord.date,
        parsedAmount,
        reason ? reason.trim() : currentRecord.reason,
        payment_mode || currentRecord.payment_mode,
        newStatus,
        id
      ]
    );

    res.json({
      message: 'Advance updated successfully',
      advance: result.rows[0]
    });
  } catch (err) {
    console.error('Update advance error:', err);
    res.status(500).json({ error: 'Failed to update advance record.' });
  }
});

// DELETE /api/advances/:id - delete advance
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM advances WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Advance record not found.' });
    }

    if (existing.rows[0].status === 'settled' || parseFloat(existing.rows[0].settled_amount) > 0) {
      return res.status(400).json({
        error: 'Cannot delete advance that has already been deducted or settled in payroll. Undo the payroll deduction first.'
      });
    }

    await pool.query('DELETE FROM advances WHERE id = $1', [id]);
    res.json({ message: 'Advance record removed successfully.' });
  } catch (err) {
    console.error('Delete advance error:', err);
    res.status(500).json({ error: 'Failed to delete advance.' });
  }
});

module.exports = router;
