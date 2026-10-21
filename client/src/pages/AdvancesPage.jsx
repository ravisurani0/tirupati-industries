import React, { useEffect, useState, useCallback } from 'react';
import { advancesApi, formatCurrency, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { HandCoins, Search, Edit2, Trash2, Download } from 'lucide-react';

export default function AdvancesPage() {
  const { openModal, showToast } = useApp();
  const [advances, setAdvances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('unsettled');
  const [search, setSearch] = useState('');

  const fetchAdvances = useCallback(async () => {
    try {
      const data = await advancesApi.getAll({ status: statusFilter, search });
      setAdvances(data.advances || []);

      const kpiData = await advancesApi.getSummary();
      setSummary(kpiData.stats || null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, showToast]);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this advance record?')) return;
    try {
      await advancesApi.delete(id);
      showToast('Advance record deleted');
      fetchAdvances();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/export/advances?status=${statusFilter}`;
  };

  return (
    <div>
      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card amber">
          <div className="stat-info">
            <p>Outstanding Advances</p>
            <h3>{formatCurrency(summary?.total_unsettled || 0)}</h3>
            <div className="sub-stat">Total cash advance awaiting salary deduction</div>
          </div>
        </div>

        <div className="stat-card primary">
          <div className="stat-info">
            <p>Advances This Month</p>
            <h3>{formatCurrency(summary?.current_month_given || 0)}</h3>
            <div className="sub-stat">Disbursed in current payroll cycle</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-info">
            <p>Total Cumulative Advances</p>
            <h3>{formatCurrency(summary?.total_all_time || 0)}</h3>
            <div className="sub-stat">All-time workshop advance history</div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Issue Advance Action */}
      <div className="action-banner">
        <div className="filter-bar">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '32px', minWidth: '220px' }}
              placeholder="Search by worker or purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '13px', color: '#94a3b8' }} />
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="unsettled">Unsettled (Active Advances)</option>
            <option value="settled">Settled (Fully Repaid)</option>
            <option value="all">All Records</option>
          </select>

          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => openModal('advance', { onSave: fetchAdvances })}
        >
          <HandCoins size={16} />
          <span>Issue Advance</span>
        </button>
      </div>

      {/* Advance Records Table */}
      <div className="card">
        <div className="card-header">
          <h3>Employee Advances Ledger ({advances.length} Records)</h3>
        </div>
        <div className="table-responsive">
          <table className="app-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Disbursement Date</th>
                <th>Advance Amount</th>
                <th>Settled</th>
                <th>Remaining Balance</th>
                <th>Purpose / Reason</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading advances ledger...
                  </td>
                </tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No advance salary records found.
                  </td>
                </tr>
              ) : (
                advances.map((a) => {
                  const remaining = parseFloat(a.remaining_advance) || 0;
                  const isSettled = a.status === 'settled';

                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{a.employee_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{a.employee_designation}</div>
                      </td>
                      <td>{formatDate(a.date)}</td>
                      <td>
                        <strong style={{ color: '#d97706', fontSize: '14px' }}>
                          {formatCurrency(a.amount)}
                        </strong>
                      </td>
                      <td>{formatCurrency(a.settled_amount)}</td>
                      <td>
                        <strong
                          style={{
                            color: remaining > 0 ? '#dc2626' : '#059669',
                            fontSize: '14px'
                          }}
                        >
                          {formatCurrency(remaining)}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: '#334155' }}>
                          {a.reason || 'Personal Advance'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{a.payment_mode || 'Cash'}</span>
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openModal('advance', { advance: a, onSave: fetchAdvances })}
                            title="Edit Advance"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          {!isSettled && parseFloat(a.settled_amount) === 0 ? (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => handleDelete(a.id)}
                              title="Cancel Advance"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8', alignSelf: 'center' }}>
                              Settled
                            </span>
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
