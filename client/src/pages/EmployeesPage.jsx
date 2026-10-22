import React, { useEffect, useState, useCallback } from 'react';
import { employeesApi, formatCurrency, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { UserPlus, Eye, Edit2, Trash2, Phone } from 'lucide-react';

export default function EmployeesPage() {
  const { openModal, showToast } = useApp();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employeesApi.getAll({ type: typeFilter, status: statusFilter });
      setEmployees(data.employees || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, showToast]);

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

  const getInitials = (name) => {
    if (!name) return 'W';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // DataTable columns definition
  const columns = [
    {
      key: 'name',
      label: 'Staff Member',
      sortable: true,
      render: (emp) => (
        <div>
          <div className="font-bold text-slate-900">{emp.name}</div>
          <div className="text-xs text-slate-500">
            {emp.designation}{emp.phone ? ` • ${emp.phone}` : ''}
          </div>
        </div>
      )
    },
    {
      key: 'employment_type',
      label: 'Wage Type',
      sortable: true,
      render: (emp) => <StatusBadge status={emp.employment_type} />
    },
    {
      key: 'base_salary',
      label: 'Base Rate',
      sortable: true,
      sortValue: (emp) => parseFloat(emp.base_salary) || 0,
      render: (emp) => {
        const isFixed = emp.employment_type === 'fixed';
        return isFixed ? (
          <span><strong>{formatCurrency(emp.base_salary)}</strong><span className="text-xs text-slate-500">/mo</span></span>
        ) : (
          <span><strong>{formatCurrency(emp.base_salary)}</strong><span className="text-xs text-slate-500">/hr</span></span>
        );
      }
    },
    {
      key: 'standard_hours_per_day',
      label: 'Shift',
      sortable: true,
      sortValue: (emp) => parseFloat(emp.standard_hours_per_day) || 8,
      render: (emp) => `${emp.standard_hours_per_day || 8}h/day`
    },
    {
      key: 'unsettled_advance_total',
      label: 'Advance Bal',
      sortable: true,
      sortValue: (emp) => parseFloat(emp.unsettled_advance_total) || 0,
      render: (emp) => {
        const unsettled = parseFloat(emp.unsettled_advance_total) || 0;
        return unsettled > 0 ? (
          <span className="badge badge-warning">{formatCurrency(unsettled)}</span>
        ) : (
          <span className="badge badge-neutral text-slate-400">None</span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (emp) => <StatusBadge status={emp.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (emp) => (
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-outline btn-sm text-slate-700"
            onClick={() => openModal('profile', { employeeId: emp.id })}
            title="View Full Profile & Past Ledger"
          >
            <Eye size={13} />
            <span>Profile</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm text-slate-700"
            onClick={() => openModal('employee', { employee: emp, onSave: fetchEmployees })}
            title="Edit Employee Details"
          >
            <Edit2 size={13} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm text-red-600"
            onClick={() => handleDelete(emp.id, emp.name)}
            title="Remove or Deactivate Worker"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  // Mobile Card Renderer
  const renderCard = (emp) => {
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
            className="btn btn-outline btn-sm text-red-600"
            style={{ flex: '0 0 44px' }}
            onClick={() => handleDelete(emp.id, emp.name)}
            aria-label="Remove Worker"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  // Extra filter selects to put in topActions
  const topFilters = (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        className="form-select form-select-sm text-xs py-1 px-2.5"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
      >
        <option value="all">All Wage Types</option>
        <option value="fixed">Fixed Monthly</option>
        <option value="hourly">Hourly Rate</option>
      </select>

      <select
        className="form-select form-select-sm text-xs py-1 px-2.5"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="all">All Statuses</option>
        <option value="active">Active Staff</option>
        <option value="inactive">Inactive Staff</option>
      </select>
    </div>
  );

  return (
    <div>
      {/* Top Action & Filter Bar */}
      <div className="action-banner flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Workshop Employees</h2>
          <p className="text-xs text-slate-500">Manage permanent and hourly workshop technicians and staff</p>
        </div>

        <button
          className="btn btn-primary btn-sm justify-center shrink-0 w-full sm:w-auto"
          onClick={() => openModal('employee', { onSave: fetchEmployees })}
        >
          <UserPlus size={15} />
          <span>Add Workshop Employee</span>
        </button>
      </div>

      {/* Employees Directory DataTable Card */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3>Employee Directory ({employees.length} Staff)</h3>
            <span className="text-xs text-slate-500">
              Complete employee roster with live search, column sorting, pagination & wage breakdown
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <DataTable
            data={employees}
            columns={columns}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search staff by name, phone or role..."
            pagination={true}
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            initialSort={{ key: 'name', direction: 'asc' }}
            renderCard={renderCard}
            topActions={topFilters}
            emptyMessage="No employees matching the search criteria."
          />
        </div>
      </div>
    </div>
  );
}

