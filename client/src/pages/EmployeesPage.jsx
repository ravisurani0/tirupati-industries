import React, { useEffect, useState, useCallback } from 'react';
import { employeesApi, formatCurrency, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { UserPlus, Search, Eye, Edit2, Trash2, LayoutGrid, List, Phone } from 'lucide-react';

export default function EmployeesPage() {
  const { openModal, showToast } = useApp();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await employeesApi.getAll({ search, type: typeFilter, status: statusFilter });
      setEmployees(data.employees || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate or remove ${name}?`)) return;
    try {
      await employeesApi.delete(id);
      showToast('Employee removed successfully');
      fetchEmployees();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'cards', 'table'

  const getInitials = (name) => {
    if (!name) return 'W';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div>
      {/* Top Action & Filter Bar */}
      <div className="action-banner flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="filter-bar flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="search-input-wrapper flex-1 min-w-[180px]">
            <input
              type="text"
              className="form-control w-full"
              style={{ paddingLeft: '34px' }}
              placeholder="Search staff by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>

          <select
            className="form-select w-full sm:w-auto"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Wage Types</option>
            <option value="fixed">Fixed Monthly Salary</option>
            <option value="hourly">Hourly Wage</option>
          </select>

          <select
            className="form-select w-full sm:w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Staff</option>
            <option value="inactive">Inactive Staff</option>
          </select>
        </div>

        <button
          className="btn btn-primary btn-sm justify-center shrink-0 w-full sm:w-auto"
          onClick={() => openModal('employee', { onSave: fetchEmployees })}
        >
          <UserPlus size={15} />
          <span>Add Workshop Employee</span>
        </button>
      </div>

      {/* Employees Directory Card */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3>Employee Directory ({employees.length} Staff)</h3>
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
              Loading employee directory...
            </div>
          ) : employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              No employees matching the criteria.
            </div>
          ) : (
            employees.map((emp) => {
              const isFixed = emp.employment_type === 'fixed';
              const unsettled = parseFloat(emp.unsettled_advance_total) || 0;

              return (
                <div className="worker-mobile-card" key={`card_${emp.id}`}>
                  <div className="wmc-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div className="wmc-avatar">{getInitials(emp.name)}</div>
                      <div className="wmc-title-group">
                        <div className="wmc-name">{emp.name}</div>
                        <div className="wmc-sub">{emp.designation}</div>
                      </div>
                    </div>
                    <StatusBadge status={emp.status} />
                  </div>

                  <div className="wmc-stats-grid">
                    <div className="wmc-stat-item">
                      <span className="wmc-stat-label">Wage Type</span>
                      <div style={{ marginTop: '2px' }}>
                        <StatusBadge status={emp.employment_type} />
                      </div>
                    </div>
                    <div className="wmc-stat-item">
                      <span className="wmc-stat-label">Base Rate</span>
                      <span className="wmc-stat-val" style={{ color: '#2563eb' }}>
                        {isFixed ? (
                          <>{formatCurrency(emp.base_salary)}<span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>/mo</span></>
                        ) : (
                          <>{formatCurrency(emp.base_salary)}<span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>/hr</span></>
                        )}
                      </span>
                    </div>
                    <div className="wmc-stat-item">
                      <span className="wmc-stat-label">Shift Hours</span>
                      <span className="wmc-stat-val">{emp.standard_hours_per_day || 8} hrs/day</span>
                    </div>
                    <div className="wmc-stat-item">
                      <span className="wmc-stat-label">Advances Balance</span>
                      <span className="wmc-stat-val">
                        {unsettled > 0 ? (
                          <span style={{ color: '#d97706' }}>{formatCurrency(unsettled)} Pending</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {emp.phone && (
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="#2563eb" />
                      <a href={`tel:${emp.phone}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
                        {emp.phone}
                      </a>
                    </div>
                  )}

                  <div className="wmc-actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => openModal('profile', { employeeId: emp.id })}
                    >
                      <Eye size={14} />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => openModal('employee', { employee: emp, onSave: fetchEmployees })}
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: '#dc2626', flex: '0 0 44px' }}
                      onClick={() => handleDelete(emp.id, emp.name)}
                      aria-label="Remove Worker"
                    >
                      <Trash2 size={14} />
                    </button>
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
                <th>Wage Type</th>
                <th>Base Rate</th>
                <th>Shift</th>
                <th>Advance Bal</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No employees matching the criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const isFixed = emp.employment_type === 'fixed';
                  const unsettled = parseFloat(emp.unsettled_advance_total) || 0;

                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {emp.designation}{emp.phone ? ` • ${emp.phone}` : ''}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={emp.employment_type} />
                      </td>
                      <td>
                        {isFixed ? (
                          <span><strong>{formatCurrency(emp.base_salary)}</strong>/mo</span>
                        ) : (
                          <span><strong>{formatCurrency(emp.base_salary)}</strong>/hr</span>
                        )}
                      </td>
                      <td>{emp.standard_hours_per_day || 8}h/day</td>
                      <td>
                        {unsettled > 0 ? (
                          <span className="badge badge-warning">{formatCurrency(unsettled)}</span>
                        ) : (
                          <span className="badge badge-neutral" style={{ color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={emp.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openModal('profile', { employeeId: emp.id })}
                            title="View Full Profile & Past Ledger"
                          >
                            <Eye size={13} />
                            <span>Profile</span>
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openModal('employee', { employee: emp, onSave: fetchEmployees })}
                            title="Edit Employee Details"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleDelete(emp.id, emp.name)}
                            title="Remove or Deactivate Worker"
                          >
                            <Trash2 size={13} />
                          </button>
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
