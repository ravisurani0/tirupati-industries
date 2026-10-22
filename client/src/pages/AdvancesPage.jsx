import React, { useEffect, useState, useCallback } from 'react';
import { advancesApi, formatCurrency, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import {
  HandCoins,
  Landmark,
  Search,
  Edit2,
  Trash2,
  Download,
  LayoutGrid,
  List,
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
  const [statusFilter, setStatusFilter] = useState('unsettled');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'cards', 'table'

  const fetchAdvances = useCallback(async () => {
    try {
      const data = await advancesApi.getAll({
        type: typeTab,
        status: statusFilter,
        search
      });
      setAdvances(data.advances || []);

      const kpiData = await advancesApi.getSummary();
      setSummary(kpiData.stats || null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [typeTab, statusFilter, search, showToast]);

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

  return (
    <div>
      {/* KPI Cards */}
      <div className="stats-grid">
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
              {summary?.loans_active_count || 0} active loan(s) • Total int: {formatCurrency(summary?.loans_interest_total || 0)}
            </div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-info">
            <p>Loan Repayments Collected</p>
            <h3>{formatCurrency(summary?.loans_repaid_total || 0)}</h3>
            <div className="sub-stat">Principal disbursed: {formatCurrency(summary?.loans_principal_total || 0)}</div>
          </div>
        </div>

        <div className="stat-card" style={{ background: '#f8fafc', borderLeft: '4px solid #64748b' }}>
          <div className="stat-info">
            <p>All-Time Disbursed</p>
            <h3>
              {formatCurrency(
                (parseFloat(summary?.total_all_time) || 0) + (parseFloat(summary?.loans_principal_total) || 0)
              )}
            </h3>
            <div className="sub-stat">Combined advances & staff loans</div>
          </div>
        </div>
      </div>

      {/* Tabs: All Ledgers / Salary Advances / Staff Loans */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          margin: '16px 0 12px 0',
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
          ⚡ Salary Advances (Next Month Adjustment)
        </button>
        <button
          type="button"
          className={`btn btn-sm ${typeTab === 'loan' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: '6px 6px 0 0', fontWeight: 600, borderBottom: 'none' }}
          onClick={() => setTypeTab('loan')}
        >
          🏦 Staff Loans (Interest & Multi-Repayments)
        </button>
      </div>

      {/* Filter Bar & Issue Actions */}
      <div className="action-banner flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="filter-bar flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="search-input-wrapper flex-1 min-w-[180px]">
            <input
              type="text"
              className="form-control w-full"
              style={{ paddingLeft: '34px' }}
              placeholder="Search by worker or purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
          </div>

          {/* <select
            className="form-select w-full sm:w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="unsettled">Active / Unsettled</option>
            <option value="settled">Settled (Fully Repaid)</option>
            <option value="all">All Statuses</option>
          </select> */}

          <button className="btn btn-outline btn-sm justify-center shrink-0" onClick={handleExportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            className="btn btn-primary btn-sm flex-1 sm:flex-initial justify-center"
            onClick={() => openModal('advance', { defaultType: 'advance', onSave: fetchAdvances })}
          >
            <HandCoins size={15} />
            <span>Issue Advance</span>
          </button>

          <button
            className="btn btn-success btn-sm flex-1 sm:flex-initial justify-center"
            onClick={() => openModal('advance', { defaultType: 'loan', onSave: fetchAdvances })}
          >
            <Landmark size={15} />
            <span>New Staff Loan</span>
          </button>
        </div>
      </div>

      {/* Ledger Card */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                ? 'Advances are automatically deducted from the designated next month salary'
                : typeTab === 'loan'
                  ? 'Staff loans accrue interest over elapsed days with multiple repayment entries'
                  : 'Combined view of short-term advances and interest-bearing staff loans'}
            </span>
          </div>
          <div className="view-toggle self-end sm:self-auto">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'cards' ? 'auto' : 'cards')}
              title="Cards View"
            >
              <LayoutGrid size={13} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'table' ? 'auto' : 'table')}
              title="Table View"
            >
              <List size={13} />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Mobile Cards View - ONLY visible on mobile screens unless explicitly toggled to cards */}
        <div className={`mobile-cards-list ${viewMode === 'cards' ? 'force-cards' : viewMode === 'table' ? 'hidden' : ''}`}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              Loading ledger records...
            </div>
          ) : advances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              No records found.
            </div>
          ) : (
            advances.map((a) => {
              const isLoan = a.type === 'loan';
              const remaining = isLoan
                ? (a.remaining_balance !== undefined ? a.remaining_balance : (parseFloat(a.amount) - parseFloat(a.settled_amount)))
                : (parseFloat(a.remaining_advance) || 0);
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      <span className="wmc-stat-val" style={{ color: remaining > 0 ? '#dc2626' : '#059669', fontSize: '15px' }}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>

                    {isLoan ? (
                      <>
                        <div className="wmc-stat-item">
                          <span className="wmc-stat-label">Interest ({a.interest_rate}% / {a.interest_type || 'mo'})</span>
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
                    <div style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
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

                    {!isSettled && (parseFloat(a.settled_amount) === 0 || (isLoan && (a.repayments_count || 0) === 0)) && (
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
            })
          )}
        </div>

        {/* Desktop Table View - ONLY visible on md and up unless explicitly toggled to table */}
        <div className={`table-responsive ${viewMode === 'cards' ? 'force-hidden' : viewMode === 'table' ? 'force-table' : 'hidden md:block'}`}>
          <table className="app-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Disbursed</th>
                <th>Principal</th>
                <th>Repaid</th>
                <th>Remaining</th>
                <th>Adjust / Notes</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading records...
                  </td>
                </tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No records found.
                  </td>
                </tr>
              ) : (
                advances.map((a) => {
                  const isLoan = a.type === 'loan';
                  const remaining = isLoan
                    ? (a.remaining_balance !== undefined ? a.remaining_balance : (parseFloat(a.amount) - parseFloat(a.settled_amount)))
                    : (parseFloat(a.remaining_advance) || 0);
                  const isSettled = a.status === 'settled';

                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className={`badge ${isLoan ? 'badge-primary' : 'badge-neutral'}`}
                            style={{ fontSize: '10px', textTransform: 'uppercase', padding: '2px 6px' }}
                          >
                            {isLoan ? 'Staff Loan' : 'Advance'}
                          </span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{a.employee_name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {a.employee_designation}
                        </div>
                      </td>
                      <td>{formatDate(a.date)}</td>
                      <td>
                        <strong style={{ color: '#d97706', fontSize: '13.5px' }}>
                          {formatCurrency(a.amount)}
                        </strong>
                        {isLoan && (
                          <div style={{ fontSize: '10.5px', color: '#4338ca', fontWeight: 600 }}>
                            {a.interest_rate}%/{a.interest_type || 'mo'}
                          </div>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#16a34a', fontSize: '13px' }}>
                          {formatCurrency(isLoan ? (a.total_repaid || a.settled_amount || 0) : a.settled_amount)}
                        </strong>
                        {isLoan ? (
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            {a.repayments_count || 0} inst • Int: {formatCurrency(a.total_interest || 0)}
                          </div>
                        ) : (
                          <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>0% int</div>
                        )}
                      </td>
                      <td>
                        <strong
                          style={{
                            color: remaining > 0 ? '#dc2626' : '#059669',
                            fontSize: '13.5px'
                          }}
                        >
                          {formatCurrency(remaining)}
                        </strong>
                      </td>
                      <td>
                        {!isLoan ? (
                          <div>
                            <span className="badge badge-info" style={{ fontSize: '10.5px' }}>
                              🗓 Adjust: {formatMonthLabel(a.deduction_month)}
                            </span>
                            {a.reason && (
                              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                                {a.reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#475569' }}>
                            {a.reason || 'Staff Loan'}
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {isLoan ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openModal('loanDetails', { loanId: a.id, onSave: fetchAdvances })}
                              title="Daily Summary & Repayments Ledger"
                            >
                              <Calculator size={13} />
                              <span>Summary & Repay</span>
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openModal('advance', { advance: a, onSave: fetchAdvances })}
                              title="Edit Advance"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                          )}

                          {!isSettled && (parseFloat(a.settled_amount) === 0 || (isLoan && (a.repayments_count || 0) === 0)) ? (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => handleDelete(a.id, a.type)}
                              title="Cancel Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : null}
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
