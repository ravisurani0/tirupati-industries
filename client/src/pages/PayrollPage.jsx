import React, { useEffect, useState, useCallback } from 'react';
import { payrollApi, formatCurrency } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { Calculator, Save, Download, FileText } from 'lucide-react';

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

  // Live row recalculation for inline advance deduction and bonus inputs keyed by employee_id
  const handleRowChange = (empId, field, rawVal) => {
    const val = parseFloat(rawVal) || 0;
    setPayrollRows((prev) => {
      const idx = prev.findIndex((r) => r.employee_id === empId);
      if (idx === -1) return prev;
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

  // DataTable column definitions
  const columns = [
    {
      key: 'name',
      label: 'Staff Member',
      sortable: true,
      render: (p) => {
        const isFixed = p.employment_type === 'fixed';
        const rateDisplay = isFixed
          ? `${formatCurrency(p.base_rate)}/mo`
          : `${formatCurrency(p.base_rate)}/hr`;

        return (
          <div>
            <div className="font-bold text-slate-900">{p.name}</div>
            <div className="text-xs text-slate-500">
              {p.designation} • {rateDisplay}
            </div>
          </div>
        );
      }
    },
    {
      key: 'gross_salary',
      label: 'Units & Gross',
      sortable: true,
      sortValue: (p) => parseFloat(p.gross_salary) || 0,
      render: (p) => {
        const isFixed = p.employment_type === 'fixed';
        const workUnitDisplay = isFixed
          ? `${p.effective_working_days}/${p.month_total_days} Days`
          : `${p.total_hours_worked} Hours`;

        return (
          <div>
            <div className="font-semibold text-xs text-slate-800">{workUnitDisplay}</div>
            <div className="text-xs text-slate-500">Gross: {formatCurrency(p.gross_salary)}</div>
          </div>
        );
      }
    },
    {
      key: 'advance_deduction',
      label: 'Advance Deduct',
      sortable: true,
      sortValue: (p) => parseFloat(p.advance_deduction) || 0,
      render: (p) => (
        <input
          type="number"
          step="any"
          className="form-control"
          style={{ width: '90px', fontWeight: 600, color: '#d97706', fontSize: '12px', padding: '4px 6px' }}
          value={p.advance_deduction}
          min="0"
          max={p.available_advance + p.advance_deduction}
          title={`Available advance balance: ${formatCurrency(p.available_advance)}`}
          onChange={(e) => handleRowChange(p.employee_id, 'advance_deduction', e.target.value)}
        />
      )
    },
    {
      key: 'bonus_allowance',
      label: 'Incentive / Bonus',
      sortable: true,
      sortValue: (p) => parseFloat(p.bonus_allowance) || 0,
      render: (p) => (
        <input
          type="number"
          step="any"
          className="form-control"
          style={{ width: '80px', color: '#2563eb', fontSize: '12px', padding: '4px 6px' }}
          value={p.bonus_allowance || 0}
          min="0"
          onChange={(e) => handleRowChange(p.employee_id, 'bonus_allowance', e.target.value)}
        />
      )
    },
    {
      key: 'net_salary',
      label: 'Net Payable',
      sortable: true,
      sortValue: (p) => parseFloat(p.net_salary) || 0,
      render: (p) => (
        <strong className="text-emerald-600 font-bold text-sm">
          {formatCurrency(p.net_salary)}
        </strong>
      )
    },
    {
      key: 'paid_amount',
      label: 'Disbursed',
      sortable: true,
      sortValue: (p) => parseFloat(p.paid_amount) || 0,
      render: (p) => formatCurrency(p.paid_amount)
    },
    {
      key: 'remaining_salary',
      label: 'Remaining',
      sortable: true,
      sortValue: (p) => parseFloat(p.remaining_salary) || 0,
      render: (p) => (
        <strong
          className={`font-bold text-sm ${p.remaining_salary > 0 ? 'text-red-600' : 'text-emerald-600'}`}
        >
          {formatCurrency(p.remaining_salary)}
        </strong>
      )
    },
    {
      key: 'payment_status',
      label: 'Status',
      sortable: true,
      render: (p) => <StatusBadge status={p.payment_status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (p) => (
        <div className="inline-flex items-center gap-1.5">
          {p.remaining_salary > 0 ? (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => {
                if (!p.id) {
                  alert(
                    'Please tap "Save & Lock Payroll" above first to register database records before disbursing payment.'
                  );
                  return;
                }
                openModal('payment', { item: p, month, onSave: () => fetchPayroll(month) });
              }}
            >
              Pay
            </button>
          ) : (
            <span className="badge badge-success text-[10px] px-1.5 py-0.5">Paid</span>
          )}

          {p.id ? (
            <button
              type="button"
              className="btn btn-outline btn-sm text-slate-700"
              onClick={() => openModal('slip', { payrollId: p.id })}
              title="Print Payslip Voucher"
            >
              <FileText size={13} />
              <span>Slip</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-sm opacity-50"
              onClick={() => showToast('Save payroll first to generate permanent slips', 'error')}
              title="Save payroll first"
            >
              <FileText size={13} />
              <span>Slip</span>
            </button>
          )}
        </div>
      )
    }
  ];

  // Mobile Card Renderer
  const renderCard = (p) => {
    const isFixed = p.employment_type === 'fixed';
    const rateDisplay = isFixed
      ? `${formatCurrency(p.base_rate)}/mo`
      : `${formatCurrency(p.base_rate)}/hr`;

    const workUnitDisplay = isFixed
      ? `${p.effective_working_days} / ${p.month_total_days} Days`
      : `${p.total_hours_worked} Hours`;

    return (
      <div className="payroll-mobile-card" key={`payroll_card_${p.employee_id}`}>
        <div className="wmc-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{p.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {p.designation} • {rateDisplay}
            </div>
          </div>
          <StatusBadge status={p.payment_status} />
        </div>

        <div className="payroll-card-amounts">
          <div className="wmc-stat-item">
            <span className="wmc-stat-label">Units / Gross</span>
            <span className="wmc-stat-val">
              {workUnitDisplay} • <strong style={{ color: '#0f172a' }}>{formatCurrency(p.gross_salary)}</strong>
            </span>
          </div>
          <div className="wmc-stat-item">
            <span className="wmc-stat-label">Net Payable</span>
            <span className="wmc-stat-val" style={{ color: '#059669', fontSize: '15px' }}>
              {formatCurrency(p.net_salary)}
            </span>
          </div>
          <div className="wmc-stat-item">
            <span className="wmc-stat-label">Already Disbursed</span>
            <span className="wmc-stat-val">{formatCurrency(p.paid_amount)}</span>
          </div>
          <div className="wmc-stat-item">
            <span className="wmc-stat-label">Remaining Balance</span>
            <span
              className="wmc-stat-val"
              style={{
                color: p.remaining_salary > 0 ? '#dc2626' : '#059669',
                fontSize: '15px'
              }}
            >
              {formatCurrency(p.remaining_salary)}
            </span>
          </div>
        </div>

        <div className="payroll-card-inputs">
          <div className="att-input-box">
            <label>
              Advance Deduct{' '}
              {p.available_advance > 0 && (
                <span style={{ color: '#d97706', fontSize: '10px' }}>(Max: {formatCurrency(p.available_advance)})</span>
              )}
            </label>
            <input
              type="number"
              step="any"
              className="form-control"
              style={{ fontWeight: 600, color: '#d97706' }}
              value={p.advance_deduction}
              min="0"
              max={p.available_advance + p.advance_deduction}
              onChange={(e) => handleRowChange(p.employee_id, 'advance_deduction', e.target.value)}
            />
          </div>
          <div className="att-input-box">
            <label>Bonus / Incentive</label>
            <input
              type="number"
              step="any"
              className="form-control"
              style={{ color: '#2563eb' }}
              value={p.bonus_allowance || 0}
              min="0"
              onChange={(e) => handleRowChange(p.employee_id, 'bonus_allowance', e.target.value)}
            />
          </div>
        </div>

        <div className="wmc-actions">
          {p.remaining_salary > 0 ? (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => {
                if (!p.id) {
                  alert(
                    'Please tap "Save & Lock Payroll" above first to register database records before disbursing payment.'
                  );
                  return;
                }
                openModal('payment', { item: p, month, onSave: () => fetchPayroll(month) });
              }}
            >
              Pay Now ({formatCurrency(p.remaining_salary)})
            </button>
          ) : (
            <span className="badge badge-success" style={{ padding: '8px 12px', flex: 1, textAlign: 'center' }}>
              Fully Settled
            </span>
          )}

          {p.id ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ flex: '0 0 auto' }}
              onClick={() => openModal('slip', { payrollId: p.id })}
              title="Print Payslip Voucher"
            >
              <FileText size={14} />
              <span>Slip</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ flex: '0 0 auto' }}
              onClick={() => showToast('Save payroll first to generate permanent slips', 'error')}
            >
              <FileText size={14} />
              <span>Slip</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Month Selector & Controls */}
      <div className="action-banner flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            className="btn btn-outline btn-sm flex-1 sm:flex-initial justify-center"
            onClick={() => fetchPayroll(month)}
          >
            <Calculator size={15} />
            <span>Recalculate</span>
          </button>
          <button
            className="btn btn-outline btn-sm flex-1 sm:flex-initial justify-center"
            onClick={handleExportCSV}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            className="btn btn-success btn-sm flex-1 sm:flex-initial justify-center"
            onClick={handleSaveAll}
            disabled={saving}
          >
            <Save size={15} />
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
          padding: '16px 20px',
          border: 'none',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '12px'
          }}
        >
          Monthly Payroll Summary • {month}
        </div>
        <div className="payroll-summary-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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

      {/* Payroll Sheet DataTable Card */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3>Workshop Payroll Sheet ({payrollRows.length} Staff)</h3>
            <span className="text-xs text-slate-500">
              Interactive monthly payroll calculator with inline advance deductions and bonuses
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <DataTable
            data={payrollRows}
            columns={columns}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search staff by name or role..."
            pagination={true}
            pageSize={15}
            pageSizeOptions={[10, 15, 25, 50]}
            initialSort={{ key: 'name', direction: 'asc' }}
            renderCard={renderCard}
            emptyMessage={`No staff records found for ${month}.`}
          />
        </div>
      </div>
    </div>
  );
}
