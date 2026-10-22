import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { expensesApi, formatCurrency, formatDate } from '../api';
import DataTable from '../components/DataTable';
import {
  Receipt,
  Plus,
  Download,
  Calendar,
  Tag,
  CreditCard,
  Edit2,
  Trash2,
  Clock,
  TrendingDown,
  FileSpreadsheet
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Factory Maintenance',
  'Raw Materials',
  'Tools & Machinery',
  'Utilities & Electricity',
  'Tea & Refreshments',
  'Transport & Fuel',
  'Office & Stationery',
  'Worker Welfare',
  'Miscellaneous'
];

export default function ExpensesPage() {
  const { openModal, showToast } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState('this_month'); // 'today', 'this_month', 'all'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState('All');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (period === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (period === 'this_month') {
        params.month = selectedMonth;
      }

      if (categoryFilter !== 'All') {
        params.category = categoryFilter;
      }

      const res = await expensesApi.getAll(params);
      setExpenses(res.expenses || []);
      setStats(res.stats || null);
    } catch (err) {
      showToast(err.message || 'Failed to fetch expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [period, selectedMonth, categoryFilter, showToast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete expense "${title}"?`)) return;

    try {
      await expensesApi.delete(id);
      showToast('Expense deleted successfully');
      fetchExpenses();
    } catch (err) {
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  const handleExportCSV = () => {
    const params = {};
    if (period === 'today') {
      params.date = new Date().toISOString().split('T')[0];
    } else if (period === 'this_month') {
      params.month = selectedMonth;
    }
    if (categoryFilter !== 'All') {
      params.category = categoryFilter;
    }

    const url = expensesApi.getCsvUrl(params);
    showToast('Downloading Expenses CSV Report...', 'info');
    window.location.href = url;
  };

  // Category Badge Color Mapper
  const getCategoryBadgeClass = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'factory maintenance':
      case 'tools & machinery':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'raw materials':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'utilities & electricity':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'tea & refreshments':
      case 'worker welfare':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'transport & fuel':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // DataTable Column Definitions
  const columns = [
    {
      key: 'title',
      label: 'Expense Title & Details',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.title}</div>
          {row.description ? (
            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-xs">{row.description}</div>
          ) : (
            <div className="text-xs text-slate-400 mt-0.5">No additional notes</div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (row) => (
        <span
          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${getCategoryBadgeClass(
            row.category
          )}`}
        >
          {row.category || 'General'}
        </span>
      )
    },
    {
      key: 'date',
      label: 'Date & Time',
      sortable: true,
      sortValue: (row) => `${row.date} ${row.time || '00:00'}`,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{formatDate(row.date)}</div>
          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <Clock size={11} />
            <span>{row.time || '12:00'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'payment_mode',
      label: 'Payment Mode',
      sortable: true,
      render: (row) => (
        <span className="badge badge-neutral text-xs px-2 py-0.5">
          {row.payment_mode || 'Cash'}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      sortValue: (row) => parseFloat(row.amount) || 0,
      render: (row) => (
        <strong className="text-amber-600 font-bold text-sm">
          {formatCurrency(row.amount)}
        </strong>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-outline btn-sm text-slate-700"
            onClick={() => openModal('expense', { expense: row, onSave: fetchExpenses })}
            title="Edit Expense"
          >
            <Edit2 size={13} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm text-red-600"
            onClick={() => handleDelete(row.id, row.title)}
            title="Delete Record"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  // Mobile Card Renderer
  const renderCard = (row) => (
    <div key={`exp_card_${row.id}`} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-slate-900 text-sm truncate">{row.title}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getCategoryBadgeClass(
                row.category
              )}`}
            >
              {row.category || 'General'}
            </span>
            <span className="text-xs text-slate-500">{formatDate(row.date)} • {row.time || '12:00'}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-extrabold text-amber-600">{formatCurrency(row.amount)}</div>
          <span className="badge badge-neutral text-xs mt-0.5">{row.payment_mode || 'Cash'}</span>
        </div>
      </div>

      {row.description && (
        <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
          {row.description}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          className="btn btn-outline btn-sm flex-1 sm:flex-initial justify-center"
          onClick={() => openModal('expense', { expense: row, onSave: fetchExpenses })}
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm text-red-600 shrink-0"
          onClick={() => handleDelete(row.id, row.title)}
        >
          <Trash2 size={13} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Top Action & Filter Banner */}
      <div className="action-banner flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Daily Workshop Expenses</h2>
          <p className="text-xs text-slate-500">
            Track daily petty cash, factory maintenance, machine parts, fuel & refreshments
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md transition-all ${period === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              onClick={() => setPeriod('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md transition-all ${period === 'this_month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              onClick={() => setPeriod('this_month')}
            >
              This Month
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md transition-all ${period === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              onClick={() => setPeriod('all')}
            >
              All Records
            </button>
          </div>

          {period === 'this_month' && (
            <input
              type="month"
              className="form-control form-control-sm text-xs py-1.5 px-2.5"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          )}

          {/* Category Filter */}
          <select
            className="form-select form-select-sm text-xs py-1.5"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <button
            type="button"
            className="btn btn-outline btn-sm justify-center shrink-0"
            onClick={handleExportCSV}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Add Expense Button */}
          <button
            type="button"
            className="btn btn-primary btn-sm justify-center shrink-0"
            onClick={() => openModal('expense', { onSave: fetchExpenses })}
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>


      {/* Main Expenses DataTable Card */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3>Daily Expenses Ledger ({expenses.length} Records)</h3>
            <span className="text-xs text-slate-500">
              Sorted by date and time with quick search, column sorting and pagination
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <DataTable
            data={expenses}
            columns={columns}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search by title, description, category, payment mode..."
            pagination={true}
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50, 100]}
            initialSort={{ key: 'date', direction: 'desc' }}
            renderCard={renderCard}
            emptyMessage="No expense entries found for the selected filter."
          />
        </div>
      </div>
    </div>
  );
}
