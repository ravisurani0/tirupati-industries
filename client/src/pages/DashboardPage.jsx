import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, attendanceApi, expensesApi, formatCurrency, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { UserPlus, CalendarCheck, HandCoins, Receipt, ArrowRight, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { openModal } = useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [expenseStats, setExpenseStats] = useState(null);

  const loadData = async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);

      if (data.today) {
        const attData = await attendanceApi.getByDate(data.today);
        setTodayAttendance(attData.attendance || []);
      }

      try {
        const expData = await expensesApi.getSummary();
        setExpenseStats(expData.stats || null);
      } catch (e) {
        console.error('Failed to load expense summary:', e);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading Workshop Dashboard...</div>;
  }

  const employeeCounts = stats?.employeeCounts || {};
  const todayAtt = stats?.todayAttendance || {};
  const advStats = stats?.advanceStats || {};
  const payStats = stats?.payrollStats || {};
  const recentAdvances = stats?.recentAdvances || [];

  // Attendance DataTable columns
  const attendanceColumns = [
    {
      key: 'name',
      label: 'Worker',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500">{row.designation}</div>
        </div>
      )
    },
    {
      key: 'employment_type',
      label: 'Wage Type',
      sortable: true,
      render: (row) => <StatusBadge status={row.employment_type} />
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status || 'unmarked'} />
    },
    {
      key: 'hours_worked',
      label: 'Shift Hours',
      sortable: true,
      sortValue: (row) => parseFloat(row.hours_worked) || 0,
      render: (row) => <strong>{row.hours_worked || 0} hrs</strong>
    }
  ];

  const renderAttendanceCard = (row) => (
    <div
      key={`mob_att_${row.employee_id}`}
      className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 mb-2"
    >
      <div className="min-w-0">
        <div className="font-semibold text-sm text-slate-900 truncate">{row.name}</div>
        <div className="text-xs text-slate-500">{row.designation} • {row.hours_worked || 0} hrs</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge status={row.employment_type} />
        <StatusBadge status={row.status || 'unmarked'} />
      </div>
    </div>
  );

  // Advances DataTable columns
  const advancesColumns = [
    {
      key: 'employee_name',
      label: 'Worker',
      sortable: true,
      render: (adv) => (
        <div>
          <div className="font-semibold text-slate-900">{adv.employee_name}</div>
          <div className="text-xs text-slate-500">{adv.reason || 'Personal'}</div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      sortValue: (adv) => parseFloat(adv.amount) || 0,
      render: (adv) => <strong className="text-amber-600 font-bold">{formatCurrency(adv.amount)}</strong>
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (adv) => formatDate(adv.date)
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      sortValue: (adv) => parseFloat(adv.amount) - parseFloat(adv.settled_amount || 0),
      render: (adv) => {
        const remaining = parseFloat(adv.amount) - parseFloat(adv.settled_amount || 0);
        return remaining > 0 ? (
          <span className="badge badge-warning">{formatCurrency(remaining)}</span>
        ) : (
          <span className="badge badge-success">Settled</span>
        );
      }
    }
  ];

  const renderAdvanceCard = (adv) => {
    const remaining = parseFloat(adv.amount) - parseFloat(adv.settled_amount || 0);
    return (
      <div
        key={`mob_adv_${adv.id}`}
        className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 mb-2"
      >
        <div className="min-w-0">
          <div className="font-semibold text-sm text-slate-900 truncate">{adv.employee_name}</div>
          <div className="text-xs text-slate-500">
            {formatDate(adv.date)} • {adv.reason || 'Personal'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-sm text-amber-600">{formatCurrency(adv.amount)}</div>
          <div className="text-xs mt-0.5">
            {remaining > 0 ? (
              <span className="badge badge-warning">{formatCurrency(remaining)}</span>
            ) : (
              <span className="badge badge-success">Settled</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Quick Action Top Banner */}
      <div className="action-banner flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Workshop Quick Actions</h3>
          <p className="text-xs text-slate-500">Fast-track daily worker check-ins, petty expenses, advances & payroll</p>
        </div>
        <div className="dashboard-actions-grid grid grid-cols-2 sm:grid-cols-5 gap-2 w-full xl:w-auto">
          <button
            className="btn btn-primary btn-sm justify-center"
            onClick={() => openModal('employee', { onSave: loadData })}
          >
            <UserPlus size={15} />
            <span>Add Worker</span>
          </button>
          <button
            className="btn btn-outline btn-sm justify-center"
            onClick={() => openModal('expense', { onSave: loadData })}
          >
            <Receipt size={15} />
            <span>Add Expense</span>
          </button>
          <button
            className="btn btn-outline btn-sm justify-center"
            onClick={() => openModal('advance', { onSave: loadData })}
          >
            <HandCoins size={15} />
            <span>Issue Advance</span>
          </button>
          <button
            className="btn btn-outline btn-sm justify-center"
            onClick={() => navigate('/attendance')}
          >
            <CalendarCheck size={15} />
            <span>Attendance</span>
          </button>
          <button
            className="btn btn-outline btn-sm justify-center"
            onClick={() => navigate('/payroll')}
          >
            <Receipt size={15} />
            <span>Payroll Sheet</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards (5 grid items) */}
      <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Active Staff"
          value={employeeCounts.active_employees || 0}
          sub={`${employeeCounts.fixed_count || 0} Fixed • ${employeeCounts.hourly_count || 0} Hourly`}
          icon="users"
          variant="primary"
        />
        <StatCard
          title="Today's Present"
          value={todayAtt.present_today || 0}
          sub={`${todayAtt.half_day_today || 0} Half • ${todayAtt.absent_today || 0} Absent • ${todayAtt.unmarked_today || 0} Pending`}
          icon="check"
          variant="success"
        />
        <StatCard
          title="Daily Expenses"
          value={formatCurrency(expenseStats?.today_total || 0)}
          sub={`This Month: ${formatCurrency(expenseStats?.month_total || 0)}`}
          icon="rupee"
          variant="primary"
        />
        <StatCard
          title="Advances Disbursed"
          value={formatCurrency(advStats.total_unsettled_advance || 0)}
          sub={`This Month: ${formatCurrency(advStats.month_advance_given || 0)}`}
          icon="rupee"
          variant="amber"
        />
        <StatCard
          title="Remaining Salary"
          value={formatCurrency(payStats.total_remaining_salary || 0)}
          sub={`Gross: ${formatCurrency(payStats.total_gross_salary || 0)} • Net: ${formatCurrency(payStats.total_net_salary || 0)}`}
          icon="trend"
          variant="danger"
        />
      </div>

      {/* Side-by-side DataTables */}
      <div className="dashboard-tables-grid grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Today's Attendance Feed DataTable */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Today's Worker Attendance</h3>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/attendance')}>
              <span>Full Matrix</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="p-3 sm:p-4">
            <DataTable
              data={todayAttendance}
              columns={attendanceColumns}
              searchable={true}
              searchPlaceholder="Filter workers..."
              pagination={true}
              pageSize={5}
              pageSizeOptions={[5, 10, 20]}
              initialSort={{ key: 'name', direction: 'asc' }}
              renderCard={renderAttendanceCard}
              emptyMessage="No attendance logged for today."
            />
          </div>
        </div>

        {/* Right: Recent Advances Ledger DataTable */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Recent Worker Advances</h3>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/advances')}>
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="p-3 sm:p-4">
            <DataTable
              data={recentAdvances}
              columns={advancesColumns}
              searchable={true}
              searchPlaceholder="Filter advances..."
              pagination={true}
              pageSize={5}
              pageSizeOptions={[5, 10, 20]}
              initialSort={{ key: 'date', direction: 'desc' }}
              renderCard={renderAdvanceCard}
              emptyMessage="No advance disbursements recorded yet."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
