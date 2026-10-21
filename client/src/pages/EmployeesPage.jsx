import React, { useEffect, useState, useCallback } from 'react';
import { employeesApi, formatCurrency, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { UserPlus, Search, Filter, Eye, Edit2, Trash2 } from 'lucide-react';

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

  return (
    <div>
      {/* Top Action & Filter Bar */}
      <div className="action-banner">
        <div className="filter-bar">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '32px', minWidth: '220px' }}
              placeholder="Search staff by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '13px', color: '#94a3b8' }} />
          </div>

          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Wage Types</option>
            <option value="fixed">Fixed Monthly Salary</option>
            <option value="hourly">Hourly Wage</option>
          </select>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Staff</option>
            <option value="inactive">Inactive Staff</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => openModal('employee', { onSave: fetchEmployees })}
        >
          <UserPlus size={16} />
          <span>Add Workshop Employee</span>
        </button>
      </div>

      {/* Employees Table Card */}
      <div className="card">
        <div className="card-header">
          <h3>Employee Directory ({employees.length} Staff)</h3>
        </div>
        <div className="table-responsive">
          <table className="app-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Designation</th>
                <th>Wage Type</th>
                <th>Base Rate</th>
                <th>Standard Shift</th>
                <th>Advance Balance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
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
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{emp.phone || 'No phone'}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{emp.designation}</span>
                      </td>
                      <td>
                        <StatusBadge status={emp.employment_type} />
                      </td>
                      <td>
                        {isFixed ? (
                          <span><strong>{formatCurrency(emp.base_salary)}</strong> / mo</span>
                        ) : (
                          <span><strong>{formatCurrency(emp.base_salary)}</strong> / hr</span>
                        )}
                      </td>
                      <td>{emp.standard_hours_per_day || 8} hrs/day</td>
                      <td>
                        {unsettled > 0 ? (
                          <span className="badge badge-warning">{formatCurrency(unsettled)} Pending</span>
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
