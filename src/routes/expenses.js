const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Helper to get formatted date string YYYY-MM-DD
function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get current month YYYY-MM
function getCurrentMonthStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Helper to get current time HH:mm
function getCurrentTimeStr() {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// GET /api/expenses - List all expenses with optional filters and KPI stats
router.get('/', async (req, res) => {
  try {
    const { date, month, category, search, startDate, endDate } = req.query;

    let query = `
      SELECT 
        id,
        title,
        description,
        amount,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        time,
        category,
        payment_mode,
        created_by,
        created_at,
        updated_at
      FROM expenses
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      params.push(date);
      query += ` AND date = $${params.length}`;
    } else if (startDate && endDate) {
      params.push(startDate);
      params.push(endDate);
      query += ` AND date >= $${params.length - 1} AND date <= $${params.length}`;
    } else if (month) {
      params.push(`${month}%`);
      query += ` AND TO_CHAR(date, 'YYYY-MM') LIKE $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND LOWER(category) = LOWER($${params.length})`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
    }

    query += ` ORDER BY date DESC, time DESC, id DESC`;

    const { rows: expenses } = await pool.query(query, params);

    // Calculate Summary Stats
    const todayStr = getTodayDateStr();
    const currentMonthStr = getCurrentMonthStr();

    const statsQuery = `
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE date = $1), 0) AS today_total,
        COALESCE(COUNT(*) FILTER (WHERE date = $1), 0) AS today_count,
        COALESCE(SUM(amount) FILTER (WHERE TO_CHAR(date, 'YYYY-MM') = $2), 0) AS month_total,
        COALESCE(COUNT(*) FILTER (WHERE TO_CHAR(date, 'YYYY-MM') = $2), 0) AS month_count,
        COALESCE(SUM(amount), 0) AS all_time_total,
        COALESCE(COUNT(*), 0) AS all_time_count
      FROM expenses
    `;
    const { rows: statsRows } = await pool.query(statsQuery, [todayStr, currentMonthStr]);
    const stats = statsRows[0] || {};

    res.json({
      expenses,
      stats: {
        today_total: parseFloat(stats.today_total) || 0,
        today_count: parseInt(stats.today_count, 10) || 0,
        month_total: parseFloat(stats.month_total) || 0,
        month_count: parseInt(stats.month_count, 10) || 0,
        all_time_total: parseFloat(stats.all_time_total) || 0,
        all_time_count: parseInt(stats.all_time_count, 10) || 0
      }
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to retrieve expenses' });
  }
});

// GET /api/expenses/summary - Quick summary KPI cards
router.get('/summary', async (req, res) => {
  try {
    const todayStr = getTodayDateStr();
    const currentMonthStr = getCurrentMonthStr();

    const statsQuery = `
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE date = $1), 0) AS today_total,
        COALESCE(COUNT(*) FILTER (WHERE date = $1), 0) AS today_count,
        COALESCE(SUM(amount) FILTER (WHERE TO_CHAR(date, 'YYYY-MM') = $2), 0) AS month_total,
        COALESCE(COUNT(*) FILTER (WHERE TO_CHAR(date, 'YYYY-MM') = $2), 0) AS month_count,
        COALESCE(SUM(amount), 0) AS all_time_total,
        COALESCE(COUNT(*), 0) AS all_time_count
      FROM expenses
    `;
    const { rows } = await pool.query(statsQuery, [todayStr, currentMonthStr]);
    res.json({ stats: rows[0] });
  } catch (err) {
    console.error('Error fetching expenses summary:', err);
    res.status(500).json({ error: 'Failed to retrieve expenses summary' });
  }
});

// GET /api/expenses/:id - Single expense by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT 
        id,
        title,
        description,
        amount,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        time,
        category,
        payment_mode,
        created_by,
        created_at,
        updated_at
       FROM expenses 
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }

    res.json({ expense: rows[0] });
  } catch (err) {
    console.error('Error fetching expense details:', err);
    res.status(500).json({ error: 'Failed to retrieve expense record' });
  }
});

// POST /api/expenses - Create new expense
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      date,
      time,
      category = 'General',
      payment_mode = 'Cash'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Expense title is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid expense amount greater than 0' });
    }

    const expenseDate = date || getTodayDateStr();
    const expenseTime = time || getCurrentTimeStr();
    const createdBy = req.user?.fullName || req.user?.username || 'Admin';

    const insertQuery = `
      INSERT INTO expenses (
        title,
        description,
        amount,
        date,
        time,
        category,
        payment_mode,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        title,
        description,
        amount,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        time,
        category,
        payment_mode,
        created_by,
        created_at
    `;

    const { rows } = await pool.query(insertQuery, [
      title.trim(),
      description ? description.trim() : null,
      parsedAmount,
      expenseDate,
      expenseTime,
      category,
      payment_mode,
      createdBy
    ]);

    res.status(201).json({
      message: 'Expense recorded successfully',
      expense: rows[0]
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to record expense' });
  }
});

// PUT /api/expenses/:id - Update an expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      amount,
      date,
      time,
      category,
      payment_mode
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Expense title is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid expense amount greater than 0' });
    }

    const updateQuery = `
      UPDATE expenses
      SET
        title = $1,
        description = $2,
        amount = $3,
        date = $4,
        time = $5,
        category = $6,
        payment_mode = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING 
        id,
        title,
        description,
        amount,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        time,
        category,
        payment_mode,
        created_by,
        updated_at
    `;

    const { rows } = await pool.query(updateQuery, [
      title.trim(),
      description !== undefined ? (description ? description.trim() : null) : null,
      parsedAmount,
      date || getTodayDateStr(),
      time || getCurrentTimeStr(),
      category || 'General',
      payment_mode || 'Cash',
      id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }

    res.json({
      message: 'Expense updated successfully',
      expense: rows[0]
    });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id - Delete an expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Expense record not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
