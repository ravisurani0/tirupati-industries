import React, { useEffect, useState, useCallback } from 'react';
import { advancesApi, formatCurrency, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import {
  HandCoins,
  Landmark,
  Edit2,
  Trash2,
  Download,
  Calculator,
  PlusCircle,
  Receipt,
  Calendar,
  Clock,
  TrendingUp,
  Percent
} from 'lucide-react';

function formatMonthLabel(monthStr) {
  if (!monthStr) return 'Next Month';
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function AdvancesPage() {
  const { openModal, showToast } = useApp();
  const [advances, setAdvances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [typeTab, setTypeTab] = useState('all'); // 'all', 'advance', 'loan'
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchAdvances = useCallback(async () => {
    try {
      setLoading(true);
      const data = await advancesApi.getAll({
        type: typeTab,
        status: statusFilter
      });
      setAdvances(data.advances || []);

      const kpiData = await advancesApi.getSummary();
      setSummary(kpiData.stats || null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [typeTab, statusFilter, showToast]);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const handleDelete = async (id, type) => {
    const isLoan = type === 'loan';
    if (!window.confirm(`Are you sure you want to remove this ${isLoan ? 'loan' : 'advance'} record?`)) return;
    try {
      await advancesApi.delete(id);
      showToast(`${isLoan ? 'Loan' : 'Advance'} record deleted`);
      fetchAdvances();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/export/advances?status=${statusFilter}&type=${typeTab}`;
  };

  // DataTable column definitions
  const columns = [
    {
      key: 'employee_name',
      label: 'Staff Member',
      sortable: true,
      render: (a) => {
        const isLoan = a.type === 'loan';
        return (
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`badge ${isLoan ? 'badge-primary' : 'badge-neutral'} text-[10px] uppercase px-1.5 py-0.5`}
              >
                {isLoan ? 'Staff Loan' : 'Advance'}
              </span>
              <span className="font-bold text-slate-900">{a.employee_name}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{a.employee_designation}</div>
          </div>
        );
      }
    },
    {
      key: 'date',
      label: 'Disbursed',
      sortable: true,
      render: (a) => formatDate(a.date)
    },
    {
      key: 'amount',
      label: 'Principal',
      sortable: true,
      sortValue: (a) => parseFloat(a.amount) || 0,
      render: (a) => (
        <div>
          <strong className="text-amber-600 font-bold text-sm">
            {formatCurrency(a.amount)}
          </strong>
          {a.type === 'loan' && (
            <div className="text-[10.5px] text-indigo-700 font-semibold">
              {a.interest_rate}%/{a.interest_type || 'mo'}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'repaid',
      label: 'Repaid',
      sortable: true,
      sortValue: (a) =>
        parseFloat(a.type === 'loan' ? a.total_repaid || a.settled_amount || 0 : a.settled_amount) || 0,
      render: (a) => {
        const isLoan = a.type === 'loan';
        const repaidAmt = isLoan ? a.total_repaid || a.settled_amount || 0 : a.settled_amount;
        return (
          <div>
            <strong className="text-emerald-600 font-semibold text-xs">
              {formatCurrency(repaidAmt)}
            </strong>
            {isLoan ? (
              <div className="text-[10px] text-slate-500">
                {a.repayments_count || 0} inst • Int: {formatCurrency(a.total_interest || 0)}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">0% int</div>
            )}
          </div>
        );
      }
    },
    {
      key: 'remaining',
      label: 'Remaining',
      sortable: true,
      sortValue: (a) => {
        const isLoan = a.type === 'loan';
        return isLoan
          ? a.remaining_balance !== undefined
            ? parseFloat(a.remaining_balance)
            : parseFloat(a.amount) - parseFloat(a.settled_amount)
          : parseFloat(a.remaining_advance) || 0;
      },
      render: (a) => {
        const isLoan = a.type === 'loan';
        const remaining = isLoan
          ? a.remaining_balance !== undefined
            ? a.remaining_balance
            : parseFloat(a.amount) - parseFloat(a.settled_amount)
          : parseFloat(a.remaining_advance) || 0;

        return (
          <strong className={`font-bold text-sm ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(remaining)}
          </strong>
        );
      }
    },
    {
      key: 'reason',
      label: 'Adjust / Notes',
      sortable: true,
      render: (a) => {
        const isLoan = a.type === 'loan';
        return !isLoan ? (
          <div>
            <span className="badge badge-info text-[10.5px]">
              🗓 Adjust: {formatMonthLabel(a.deduction_month)}
            </span>
            {a.reason && <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">{a.reason}</div>}
          </div>
        ) : (
          <span className="text-xs text-slate-600">{a.reason || 'Staff Loan'}</span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (a) => <StatusBadge status={a.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (a) => {
        const isLoan = a.type === 'loan';
        const isSettled = a.status === 'settled';

        return (
          <div className="inline-flex items-center gap-1.5">
            {isLoan ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openModal('loanDetails', { loanId: a.id, onSave: fetchAdvances })}
                title="Daily Summary & Repayments Ledger"
              >
                <Calculator size={13} />
                <span>Summary & Repay</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm text-slate-700"
                onClick={() => openModal('advance', { advance: a, onSave: fetchAdvances })}
                title="Edit Advance"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
            )}

            {!isSettled &&
            (parseFloat(a.settled_amount) === 0 || (isLoan && (a.repayments_count || 0) === 0)) ? (
              <button
                type="button"
                className="btn btn-outline btn-sm text-red-600"
                onClick={() => handleDelete(a.id, a.type)}
                title="Cancel Record"
              >
                <Trash2 size={13} />
              </button>
            ) : null}
          </div>
        );
      }
    }
  ];

  // Mobile Card Renderer
  const renderCard = (a) => {
    const isLoan = a.type === 'loan';
    const remaining = isLoan
      ? a.remaining_balance !== undefined
        ? a.remaining_balance
        : parseFloat(a.amount) - parseFloat(a.settled_amount)
      : parseFloat(a.remaining_advance) || 0;
    const isSettled = a.status === 'settled';

    return (
      <div
        className="adv-mobile-card"
        key={`adv_card_${a.id}`}
        style={{
          borderLeft: isLoan ? '4px solid #4f46e5' : '4px solid #d97706'
        }}
      >
        <div className="wmc-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                className={`badge ${isLoan ? 'badge-primary' : 'badge-neutral'}`}
                style={{ fontSize: '10.5px', textTransform: 'uppercase' }}
              >
                {isLoan ? 'Staff Loan' : 'Salary Advance'}
              </span>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                {a.employee_name}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {a.employee_designation} • {formatDate(a.date)}
            </div>
          </div>
          <StatusBadge status={a.status} />
        </div>

        <div className="wmc-stats-grid">
          <div className="wmc-stat-item">
            <span className="wmc-stat-label">{isLoan ? 'Principal Amount' : 'Advance Amount'}</span>
            <span className="wmc-stat-val" style={{ color: '#d97706', fontSize: '15px' }}>
              {formatCurrency(a.amount)}
            </span>
          </div>

          <div className="wmc-stat-item">
            <span className="wmc-stat-label">Remaining Balance</span>
            <span
              className="wmc-stat-val"
              style={{ color: remaining > 0 ? '#dc2626' : '#059669', fontSize: '15px' }}
            >
              {formatCurrency(remaining)}
            </span>
          </div>

          {isLoan ? (
            <>
              <div className="wmc-stat-item">
                <span className="wmc-stat-label">
                  Interest ({a.interest_rate}% / {a.interest_type || 'mo'})
                </span>
                <span className="wmc-stat-val" style={{ color: '#4338ca' }}>
                  {formatCurrency(a.total_interest || 0)}
                </span>
              </div>
              <div className="wmc-stat-item">
                <span className="wmc-stat-label">Repaid ({a.repayments_count || 0} entries)</span>
                <span className="wmc-stat-val" style={{ color: '#16a34a' }}>
                  {formatCurrency(a.total_repaid || a.settled_amount || 0)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="wmc-stat-item">
                <span className="wmc-stat-label">Already Settled</span>
                <span className="wmc-stat-val">{formatCurrency(a.settled_amount)}</span>
              </div>
              <div className="wmc-stat-item">
                <span className="wmc-stat-label">Adjust In Salary</span>
                <span className="wmc-stat-val" style={{ color: '#0369a1', fontSize: '12px' }}>
                  {formatMonthLabel(a.deduction_month)}
                </span>
              </div>
            </>
          )}
        </div>

        {a.reason && (
          <div
            style={{
              fontSize: '12px',
              color: '#475569',
              background: '#f8fafc',
              padding: '6px 10px',
              borderRadius: '6px'
            }}
          >
            <strong>Purpose:</strong> {a.reason}
          </div>
        )}

        <div className="wmc-actions flex flex-wrap items-center justify-end gap-2 pt-2.5">
          {isLoan ? (
            <button
              type="button"
              className="btn btn-primary btn-sm flex-1 sm:flex-initial justify-center"
              onClick={() => openModal('loanDetails', { loanId: a.id, onSave: fetchAdvances })}
            >
              <Calculator size={14} />
              <span>Daily Summary & Repayments ({a.repayments_count || 0})</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-sm flex-1 sm:flex-initial justify-center"
              onClick={() => openModal('advance', { advance: a, onSave: fetchAdvances })}
            >
              <Edit2 size={14} />
              <span>Edit</span>
            </button>
          )}

          {!isSettled &&
            (parseFloat(a.settled_amount) === 0 || (isLoan && (a.repayments_count || 0) === 0)) && (
              <button
                type="button"
                className="btn btn-outline btn-sm text-red-600 shrink-0 justify-center"
                onClick={() => handleDelete(a.id, a.type)}
              >
                <Trash2 size={14} />
                <span>Cancel</span>
              </button>
            )}
        </div>
      </div>
    );
  };

  const topFilters = (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        className="form-select form-select-sm text-xs py-1 px-2.5"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="all">All Statuses</option>
        <option value="unsettled">Active / Unsettled</option>
        <option value="settled">Settled (Paid)</option>
      </select>

      <button
        type="button"
        className="btn btn-outline btn-sm justify-center shrink-0"
        onClick={handleExportCSV}
      >
        <Download size={13} />
        <span>CSV</span>
      </button>
    </div>
  );

  return (
    <div>
      {/* KPI Cards */}
      <div className="stats-grid mb-4">
        <div className="stat-card amber">
          <div className="stat-info">
            <p>Outstanding Salary Advances</p>
            <h3>{formatCurrency(summary?.total_unsettled || 0)}</h3>
            <div className="sub-stat">Adjusts automatically in next month's salary</div>
          </div>
        </div>

        <div className="stat-card primary">
          <div className="stat-info">
            <p>Active Staff Loans Balance</p>
            <h3>{formatCurrency(summary?.loans_remaining_total || 0)}</h3>
            <div className="sub-stat">
              {summary?.loans_active_count || 0} active loan(s) • Total int:{' '}
              {formatCurrency(summary?.loans_interest_total || 0)}
            </div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-info">
            <p>Loan Repayments Collected</p>
            <h3>{formatCurrency(summary?.loans_repaid_total || 0)}</h3>
            <div className="sub-stat">
              Principal disbursed: {formatCurrency(summary?.loans_principal_total || 0)}
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ background: '#f8fafc', borderLeft: '4px solid #64748b' }}>
          <div className="stat-info">
            <p>All-Time Disbursed</p>
            <h3>
              {formatCurrency(
                (parseFloat(summary?.total_all_time) || 0) +
                  (parseFloat(summary?.loans_principal_total) || 0)
              )}
            </h3>
            <div className="sub-stat">Combined advances & staff loans</div>
          </div>
        </div>
      </div>

      {/* Tabs: All Ledgers / Salary Advances / Staff Loans */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '2px',
            overflowX: 'auto'
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${typeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '6px 6px 0 0', fontWeight: 600, borderBottom: 'none' }}
            onClick={() => setTypeTab('all')}
          >
            All Records ({advances.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${typeTab === 'advance' ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '6px 6px 0 0', fontWeight: 600, borderBottom: 'none' }}
            onClick={() => setTypeTab('advance')}
          >
            ⚡ Salary Advances
          </button>
          <button
            type="button"
            className={`btn btn-sm ${typeTab === 'loan' ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '6px 6px 0 0', fontWeight: 600, borderBottom: 'none' }}
            onClick={() => setTypeTab('loan')}
          >
            🏦 Staff Loans
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn btn-primary btn-sm justify-center"
            onClick={() => openModal('advance', { defaultType: 'advance', onSave: fetchAdvances })}
          >
            <HandCoins size={15} />
            <span>Issue Advance</span>
          </button>

          <button
            className="btn btn-success btn-sm justify-center"
            onClick={() => openModal('advance', { defaultType: 'loan', onSave: fetchAdvances })}
          >
            <Landmark size={15} />
            <span>New Staff Loan</span>
          </button>
        </div>
      </div>

      {/* Ledger DataTable Card */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 style={{ margin: 0 }}>
              {typeTab === 'loan'
                ? 'Staff Loans Ledger'
                : typeTab === 'advance'
                ? 'Salary Advances Ledger'
                : 'Advances & Loans Ledger'}{' '}
              ({advances.length} Records)
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {typeTab === 'advance'
                ? 'Advances are automatically deducted from designated next month salary'
                : typeTab === 'loan'
                ? 'Staff loans accrue interest over elapsed days with multiple repayment entries'
                : 'Combined view of short-term advances and interest-bearing staff loans'}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <DataTable
            data={advances}
            columns={columns}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search by worker, purpose, or status..."
            pagination={true}
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            initialSort={{ key: 'date', direction: 'desc' }}
            renderCard={renderCard}
            topActions={topFilters}
            emptyMessage="No advance or loan records found."
          />
        </div>
      </div>
    </div>
  );
}

