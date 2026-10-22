const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { calculateLoanDetails, getNextMonth } = require('../utils/loanCalculator');

router.use(authenticateToken);

// GET /api/advances - list advances & loans with filters
router.get('/', async (req, res) => {
  try {
    const { employee_id, status, month, search, type } = req.query;
    let query = `
      SELECT 
        a.*,
        COALESCE(a.type, 'advance') AS type,
        e.name AS employee_name,
        e.designation AS employee_designation,
        e.employment_type,
        e.phone AS employee_phone,
        (a.amount - a.settled_amount) AS remaining_advance,
        COALESCE(rep.repayments_count, 0) AS repayments_count,
        COALESCE(rep.total_repaid, 0) AS total_repaid
      FROM advances a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN (
        SELECT advance_id, COUNT(*) AS repayments_count, SUM(amount) AS total_repaid
        FROM loan_repayments
        GROUP BY advance_id
      ) rep ON a.id = rep.advance_id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      params.push(employee_id);
      query += ` AND a.employee_id = $${params.length}`;
    }

    if (type && type !== 'all') {
      params.push(type);
      query += ` AND a.type = $${params.length}`;
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

    // If there are loans, fetch repayments for all loans in batch to calculate daily summaries
    const loanRows = result.rows.filter(r => r.type === 'loan');
    let repaymentsMap = {};

    if (loanRows.length > 0) {
      const loanIds = loanRows.map(r => r.id);
      const repRes = await pool.query(
        `SELECT * FROM loan_repayments WHERE advance_id = ANY($1) ORDER BY repayment_date ASC, id ASC`,
        [loanIds]
      );
      for (const rep of repRes.rows) {
        if (!repaymentsMap[rep.advance_id]) repaymentsMap[rep.advance_id] = [];
        repaymentsMap[rep.advance_id].push(rep);
      }
    }

    const advances = result.rows.map(row => {
      if (row.type === 'loan') {
        const reps = repaymentsMap[row.id] || [];
        const loanCalc = calculateLoanDetails(row, reps);
        return {
          ...row,
          loan_details: loanCalc,
          total_interest: loanCalc.totalAccruedInterest,
          total_payable: loanCalc.totalPayable,
          total_repaid: loanCalc.totalRepaid,
          remaining_balance: loanCalc.remainingBalance,
          days_elapsed: loanCalc.daysElapsed,
          daily_interest: loanCalc.dailyInterestAmount,
          status: loanCalc.status
        };
      } else {
        return {
          ...row,
          deduction_month: row.deduction_month || getNextMonth(row.date)
        };
      }
    });

    res.json({ advances });
  } catch (err) {
    console.error('Fetch advances error:', err);
    res.status(500).json({ error: 'Failed to retrieve advance and loan records.' });
  }
});

// GET /api/advances/summary - KPI numbers for advances & loans
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Advance KPIs (type = 'advance' or null)
    const advStats = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_all_time,
        COALESCE(SUM(amount - settled_amount) FILTER (WHERE status != 'settled'), 0) AS total_unsettled,
        COALESCE(SUM(amount) FILTER (WHERE date::text LIKE '${currentMonth}%'), 0) AS current_month_given,
        COUNT(*) FILTER (WHERE status != 'settled') AS count_unsettled
      FROM advances
      WHERE COALESCE(type, 'advance') = 'advance'
    `);

    // 2. Loan KPIs (type = 'loan')
    const loansRes = await pool.query(`
      SELECT a.*, COALESCE(rep.total_repaid, 0) AS total_repaid
      FROM advances a
      LEFT JOIN (
        SELECT advance_id, SUM(amount) AS total_repaid
        FROM loan_repayments
        GROUP BY advance_id
      ) rep ON a.id = rep.advance_id
      WHERE a.type = 'loan'
    `);

    let loansActiveCount = 0;
    let loansPrincipalTotal = 0;
    let loansRepaidTotal = 0;
    let loansInterestTotal = 0;
    let loansRemainingTotal = 0;

    if (loansRes.rows.length > 0) {
      const loanIds = loansRes.rows.map(r => r.id);
      const repRes = await pool.query(
        `SELECT * FROM loan_repayments WHERE advance_id = ANY($1) ORDER BY repayment_date ASC, id ASC`,
        [loanIds]
      );
      const repMap = {};
      for (const rep of repRes.rows) {
        if (!repMap[rep.advance_id]) repMap[rep.advance_id] = [];
        repMap[rep.advance_id].push(rep);
      }

      for (const loan of loansRes.rows) {
        const reps = repMap[loan.id] || [];
        const calc = calculateLoanDetails(loan, reps);
        loansPrincipalTotal += calc.principalAmount;
        loansRepaidTotal += calc.totalRepaid;
        loansInterestTotal += calc.totalAccruedInterest;
        loansRemainingTotal += calc.remainingBalance;
        if (calc.status !== 'settled') {
          loansActiveCount++;
        }
      }
    }

    res.json({
      currentMonth,
      stats: {
        ...advStats.rows[0],
        loans_active_count: loansActiveCount,
        loans_principal_total: Math.round(loansPrincipalTotal * 100) / 100,
        loans_repaid_total: Math.round(loansRepaidTotal * 100) / 100,
        loans_interest_total: Math.round(loansInterestTotal * 100) / 100,
        loans_remaining_total: Math.round(loansRemainingTotal * 100) / 100
      }
    });
  } catch (err) {
    console.error('Advance summary error:', err);
    res.status(500).json({ error: 'Failed to retrieve advance summary stats.' });
  }
});

// GET /api/advances/:id - get single advance or loan with full details and repayment history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        a.*,
        COALESCE(a.type, 'advance') AS type,
        e.name AS employee_name,
        e.designation AS employee_designation,
        e.employment_type,
        e.phone AS employee_phone
       FROM advances a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const record = result.rows[0];

    if (record.type === 'loan') {
      const repRes = await pool.query(
        `SELECT * FROM loan_repayments WHERE advance_id = $1 ORDER BY repayment_date DESC, id DESC`,
        [id]
      );
      const repayments = repRes.rows;
      const loanCalc = calculateLoanDetails(record, repayments);

      return res.json({
        record: {
          ...record,
          repayments,
          loan_details: loanCalc,
          total_interest: loanCalc.totalAccruedInterest,
          total_payable: loanCalc.totalPayable,
          total_repaid: loanCalc.totalRepaid,
          remaining_balance: loanCalc.remainingBalance,
          days_elapsed: loanCalc.daysElapsed,
          daily_interest: loanCalc.dailyInterestAmount,
          status: loanCalc.status
        }
      });
    }

    res.json({
      record: {
        ...record,
        remaining_advance: parseFloat(record.amount) - parseFloat(record.settled_amount),
        deduction_month: record.deduction_month || getNextMonth(record.date)
      }
    });
  } catch (err) {
    console.error('Get advance by id error:', err);
    res.status(500).json({ error: 'Failed to retrieve record.' });
  }
});

// POST /api/advances - record a new advance or loan
router.post('/', async (req, res) => {
  try {
    const {
      employee_id,
      type = 'advance',
      date,
      amount,
      reason,
      payment_mode,
      deduction_month,
      interest_rate,
      interest_type
    } = req.body;

    if (!employee_id || !amount) {
      return res.status(400).json({ error: 'Employee and amount are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required.' });
    }

    const empCheck = await pool.query('SELECT name FROM employees WHERE id = $1', [employee_id]);
    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Selected employee does not exist.' });
    }

    const advanceDate = date || new Date().toISOString().split('T')[0];
    const isLoan = type === 'loan';

    // If advance: calculate deduction_month as next month if not provided
    const targetDeductionMonth = isLoan
      ? null
      : (deduction_month || getNextMonth(advanceDate));

    // If loan: validate interest
    const parsedRate = isLoan ? Math.max(0, parseFloat(interest_rate) || 0) : 0;
    const parsedRateType = isLoan ? (interest_type || 'monthly') : 'monthly';

    const result = await pool.query(
      `INSERT INTO advances (
        employee_id, type, date, amount, deduction_month,
        interest_rate, interest_type, reason, payment_mode, status, settled_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unsettled', 0)
      RETURNING *`,
      [
        employee_id,
        isLoan ? 'loan' : 'advance',
        advanceDate,
        parsedAmount,
        targetDeductionMonth,
        parsedRate,
        parsedRateType,
        reason ? reason.trim() : (isLoan ? 'Staff Loan' : 'Personal advance'),
        payment_mode || 'Cash'
      ]
    );

    res.status(201).json({
      message: `${isLoan ? 'Loan' : 'Salary Advance'} recorded successfully`,
      advance: result.rows[0],
      employeeName: empCheck.rows[0].name
    });
  } catch (err) {
    console.error('Create advance/loan error:', err);
    res.status(500).json({ error: 'Failed to record advance or loan.' });
  }
});

// PUT /api/advances/:id - update an advance or loan
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      amount,
      reason,
      payment_mode,
      status,
      deduction_month,
      interest_rate,
      interest_type
    } = req.body;

    const existing = await pool.query('SELECT * FROM advances WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const currentRecord = existing.rows[0];
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required.' });
    }

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
        deduction_month = $6,
        interest_rate = $7,
        interest_type = $8,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        date || currentRecord.date,
        parsedAmount,
        reason ? reason.trim() : currentRecord.reason,
        payment_mode || currentRecord.payment_mode,
        newStatus,
        currentRecord.type === 'loan' ? null : (deduction_month || currentRecord.deduction_month),
        currentRecord.type === 'loan' ? (interest_rate !== undefined ? parseFloat(interest_rate) : currentRecord.interest_rate) : 0,
        currentRecord.type === 'loan' ? (interest_type || currentRecord.interest_type || 'monthly') : 'monthly',
        id
      ]
    );

    res.json({
      message: 'Record updated successfully',
      advance: result.rows[0]
    });
  } catch (err) {
    console.error('Update advance/loan error:', err);
    res.status(500).json({ error: 'Failed to update record.' });
  }
});

// POST /api/advances/:id/repayments - Record a repayment entry under a loan
router.post('/:id/repayments', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { repayment_date, amount, payment_mode, notes } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive repayment amount is required.' });
    }

    const loanRes = await client.query('SELECT * FROM advances WHERE id = $1', [id]);
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Loan record not found.' });
    }

    const loan = loanRes.rows[0];
    if (loan.type !== 'loan') {
      return res.status(400).json({ error: 'Repayment entries can only be added to loan records.' });
    }

    await client.query('BEGIN');

    const paymentDate = repayment_date || new Date().toISOString().split('T')[0];

    // Insert repayment entry
    const repInsert = await client.query(
      `INSERT INTO loan_repayments (advance_id, repayment_date, amount, payment_mode, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        paymentDate,
        parsedAmount,
        payment_mode || 'Cash',
        notes ? notes.trim() : 'Loan repayment installment'
      ]
    );

    // Fetch all repayments to calculate updated balance & status
    const allRepsRes = await client.query(
      `SELECT * FROM loan_repayments WHERE advance_id = $1 ORDER BY repayment_date ASC, id ASC`,
      [id]
    );

    const calc = calculateLoanDetails(loan, allRepsRes.rows);

    // Update advances table settled_amount and status
    await client.query(
      `UPDATE advances SET
        settled_amount = $1,
        status = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [calc.totalRepaid, calc.status, id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Loan repayment recorded successfully',
      repayment: repInsert.rows[0],
      loan_details: calc
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Record loan repayment error:', err);
    res.status(500).json({ error: 'Failed to record loan repayment.' });
  } finally {
    client.release();
  }
});

// DELETE /api/advances/:id/repayments/:repaymentId - Remove a repayment entry
router.delete('/:id/repayments/:repaymentId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, repaymentId } = req.params;

    const repCheck = await client.query(
      'SELECT * FROM loan_repayments WHERE id = $1 AND advance_id = $2',
      [repaymentId, id]
    );
    if (repCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repayment record not found.' });
    }

    const loanRes = await client.query('SELECT * FROM advances WHERE id = $1', [id]);
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Loan record not found.' });
    }
    const loan = loanRes.rows[0];

    await client.query('BEGIN');

    await client.query('DELETE FROM loan_repayments WHERE id = $1', [repaymentId]);

    const allRepsRes = await client.query(
      `SELECT * FROM loan_repayments WHERE advance_id = $1 ORDER BY repayment_date ASC, id ASC`,
      [id]
    );

    const calc = calculateLoanDetails(loan, allRepsRes.rows);

    await client.query(
      `UPDATE advances SET
        settled_amount = $1,
        status = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [calc.totalRepaid, calc.status, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Repayment removed successfully',
      loan_details: calc
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete loan repayment error:', err);
    res.status(500).json({ error: 'Failed to delete repayment entry.' });
  } finally {
    client.release();
  }
});

// DELETE /api/advances/:id - delete advance or loan
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM advances WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const record = existing.rows[0];

    if (record.type === 'loan') {
      const repCount = await pool.query(
        'SELECT COUNT(*) FROM loan_repayments WHERE advance_id = $1',
        [id]
      );
      if (parseInt(repCount.rows[0].count, 10) > 0) {
        return res.status(400).json({
          error: 'Cannot delete loan that already contains repayment records. Delete repayments first.'
        });
      }
    } else {
      if (record.status === 'settled' || parseFloat(record.settled_amount) > 0) {
        return res.status(400).json({
          error: 'Cannot delete advance that has already been deducted or settled in payroll.'
        });
      }
    }

    await pool.query('DELETE FROM advances WHERE id = $1', [id]);
    res.json({ message: `${record.type === 'loan' ? 'Loan' : 'Advance'} record removed successfully.` });
  } catch (err) {
    console.error('Delete advance/loan error:', err);
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

module.exports = router;
