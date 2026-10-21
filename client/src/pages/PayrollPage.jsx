import React, { useEffect, useState, useCallback } from 'react';
import { payrollApi, formatCurrency } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { Calculator, Save, Download, FileText, CheckCircle2 } from 'lucide-react';

export default function PayrollPage() {
  const { openModal, showToast } = useApp();
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [month, setMonth] = useState(currentMonthStr);
  const [payrollRows, setPayrollRows] = useState([]);
  const [totals, setTotals] = useState({
    gross: 0,
    advances: 0,
    bonus: 0,
    net: 0,
    paid: 0,
    remaining: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPayroll = useCallback(async (targetMonth) => {
    try {
      setLoading(true);
      const data = await payrollApi.calculate(targetMonth);
      setPayrollRows(data.payroll || []);
      setTotals({
        gross: data.totals?.total_gross || 0,
        advances: data.totals?.total_advance_deductions || 0,
        bonus: data.totals?.total_bonus || 0,
        net: data.totals?.total_net || 0,
        paid: data.totals?.total_paid || 0,
        remaining: data.totals?.total_remaining || 0
      });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPayroll(month);
  }, [month, fetchPayroll]);

  // Live row recalculation for inline advance deduction and bonus inputs
  const handleRowChange = (idx, field, rawVal) => {
    const val = parseFloat(rawVal) || 0;
    setPayrollRows((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: val };

      const gross = item.gross_salary || 0;
      const advDeduct = field === 'advance_deduction' ? val : item.advance_deduction || 0;
      const bonus = field === 'bonus_allowance' ? val : item.bonus_allowance || 0;

      const net = Math.max(0, gross - advDeduct + bonus);
      const paid = item.paid_amount || 0;
      const rem = Math.max(0, net - paid);

      item.net_salary = net;
      item.remaining_salary = rem;
      updated[idx] = item;

      // Recalculate banner totals
      const newTotals = updated.reduce(
        (acc, p) => {
          acc.gross += p.gross_salary || 0;
          acc.advances += p.advance_deduction || 0;
          acc.bonus += p.bonus_allowance || 0;
          acc.net += p.net_salary || 0;
          acc.paid += p.paid_amount || 0;
          acc.remaining += p.remaining_salary || 0;
          return acc;
        },
        { gross: 0, advances: 0, bonus: 0, net: 0, paid: 0, remaining: 0 }
      );
      setTotals(newTotals);

      return updated;
    });
  };

  const handleSaveAll = async () => {
    if (!payrollRows.length) return;
    setSaving(true);
    try {
      await payrollApi.saveAll(month, payrollRows);
      showToast(`Monthly payroll for ${month} saved and locked!`);
      fetchPayroll(month);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/export/payroll?month=${encodeURIComponent(month)}`;
  };

  return (
    <div>
      {/* Month Selector & Controls */}
      <div className="action-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Settlement Month:</span>
            <input
              type="month"
              className="form-control"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <span className="badge badge-neutral">{payrollRows.length} Staff Configured</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => fetchPayroll(month)}>
            <Calculator size={16} />
            <span>Recalculate</span>
          </button>
          <button className="btn btn-outline" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn btn-success" onClick={handleSaveAll} disabled={saving}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save & Lock Payroll'}</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '20px 24px',
          border: 'none',
          marginBottom: '24px'
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
          Monthly Payroll Summary • {month}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Gross Wages</div>
            <div style={{ fontSize: '19px', fontWeight: 800 }}>{formatCurrency(totals.gross)}</div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#f59e0b' }}>Advance Deductions</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: '#fbbf24' }}>
              - {formatCurrency(totals.advances)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#60a5fa' }}>Bonuses / OT</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: '#93c5fd' }}>
              + {formatCurrency(totals.bonus)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#34d399' }}>Net Payable</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>
              {formatCurrency(totals.net)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>Disbursed (Paid)</div>
            <div style={{ fontSize: '19px', fontWeight: 800 }}>{formatCurrency(totals.paid)}</div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#f87171' }}>Remaining Salary</div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: totals.remaining > 0 ? '#f87171' : '#34d399'
              }}
            >
              {formatCurrency(totals.remaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Sheet Table */}
      <div className="card">
        <div className="card-header">
          <h3>Workshop Payroll Sheet</h3>
        </div>
        <div className="table-responsive">
          <table className="app-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Base Rate</th>
                <th>Working Units</th>
                <th>Gross Salary</th>
                <th>Advance Deduction</th>
                <th>Incentive / Bonus</th>
                <th>Net Payable</th>
                <th>Paid Amount</th>
                <th>Remaining</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Calculating payroll for {month}...
                  </td>
                </tr>
              ) : payrollRows.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No staff records found for {month}.
                  </td>
                </tr>
              ) : (
                payrollRows.map((p, idx) => {
                  const isFixed = p.employment_type === 'fixed';
                  const rateDisplay = isFixed
                    ? `${formatCurrency(p.base_rate)}/mo`
                    : `${formatCurrency(p.base_rate)}/hr`;

                  const workUnitDisplay = isFixed
                    ? `${p.effective_working_days} / ${p.month_total_days} Days`
                    : `${p.total_hours_worked} Hours`;

                  return (
                    <tr key={p.employee_id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{p.designation}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{rateDisplay}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {isFixed ? 'Fixed Salary' : 'Hourly Wage'}
                        </div>
                      </td>
                      <td><strong>{workUnitDisplay}</strong></td>
                      <td>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          {formatCurrency(p.gross_salary)}
                        </strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          className="form-control"
                          style={{ width: '95px', fontWeight: 600, color: '#d97706' }}
                          value={p.advance_deduction}
                          min="0"
                          max={p.available_advance + p.advance_deduction}
                          title={`Available advance balance: ${formatCurrency(p.available_advance)}`}
                          onChange={(e) => handleRowChange(idx, 'advance_deduction', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          className="form-control"
                          style={{ width: '85px', color: '#2563eb' }}
                          value={p.bonus_allowance || 0}
                          min="0"
                          onChange={(e) => handleRowChange(idx, 'bonus_allowance', e.target.value)}
                        />
                      </td>
                      <td>
                        <strong style={{ fontSize: '14px', color: '#059669' }}>
                          {formatCurrency(p.net_salary)}
                        </strong>
                      </td>
                      <td>{formatCurrency(p.paid_amount)}</td>
                      <td>
                        <strong
                          style={{
                            fontSize: '14px',
                            color: p.remaining_salary > 0 ? '#dc2626' : '#059669'
                          }}
                        >
                          {formatCurrency(p.remaining_salary)}
                        </strong>
                      </td>
                      <td>
                        <StatusBadge status={p.payment_status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {p.remaining_salary > 0 ? (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                if (!p.id) {
                                  alert(
                                    'Please click "Save & Lock Payroll" first to register database records before disbursing payment.'
                                  );
                                  return;
                                }
                                openModal('payment', { item: p, month, onSave: () => fetchPayroll(month) });
                              }}
                              title="Disburse Payment"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <span className="badge badge-success" style={{ padding: '6px 8px' }}>
                              Settled
                            </span>
                          )}

                          {p.id ? (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openModal('slip', { payrollId: p.id })}
                              title="Print Payslip Voucher"
                            >
                              <FileText size={13} />
                              <span>Slip</span>
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => showToast('Save payroll first to generate permanent slips', 'error')}
                              title="Save payroll first"
                            >
                              <FileText size={13} />
                              <span>Slip</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
