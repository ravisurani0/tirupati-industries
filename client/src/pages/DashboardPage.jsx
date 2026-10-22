import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, attendanceApi, formatCurrency, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { UserPlus, CalendarCheck, HandCoins, Receipt, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { openModal } = useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);

  const loadData = async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);

      if (data.today) {
        const attData = await attendanceApi.getByDate(data.today);
        setTodayAttendance(attData.attendance || []);
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

  return (
    <div>
      {/* Quick Action Top Banner */}
      <div className="action-banner flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Workshop Quick Actions</h3>
          <p className="text-xs text-slate-500">Fast-track daily worker check-ins, advance vouchers & payroll</p>
        </div>
        <div className="dashboard-actions-grid grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
          <button
            className="btn btn-primary btn-sm justify-center"
            onClick={() => openModal('employee', { onSave: loadData })}
          >
            <UserPlus size={15} />
            <span>Add Worker</span>
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
            <span>Log Attendance</span>
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

      {/* 4 Primary KPI Cards */}
      <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

      {/* Side-by-side Tables */}
      <div className="dashboard-tables-grid grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Today's Attendance Feed */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Today's Worker Attendance</h3>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/attendance')}>
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile Attendance Cards */}
          <div className="mobile-cards-list flex flex-col md:hidden p-3 gap-2.5">
            {todayAttendance.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                No attendance logged for today.
              </div>
            ) : (
              todayAttendance.map((row) => (
                <div
                  key={`mob_att_${row.employee_id}`}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
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
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="table-responsive hidden md:block">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Wage Type</th>
                  <th>Status</th>
                  <th>Shift Hours</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                      No attendance logged for today.
                    </td>
                  </tr>
                ) : (
                  todayAttendance.map((row) => (
                    <tr key={row.employee_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{row.designation}</div>
                      </td>
                      <td>
                        <StatusBadge status={row.employment_type} />
                      </td>
                      <td>
                        <StatusBadge status={row.status || 'unmarked'} />
                      </td>
                      <td>
                        <strong>{row.hours_worked || 0} hrs</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Advances Ledger */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Recent Worker Advances</h3>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/advances')}>
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile Advances Cards */}
          <div className="mobile-cards-list flex flex-col md:hidden p-3 gap-2.5">
            {recentAdvances.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                No advance disbursements recorded yet.
              </div>
            ) : (
              recentAdvances.map((adv) => {
                const remaining = parseFloat(adv.amount) - parseFloat(adv.settled_amount);
                return (
                  <div
                    key={`mob_adv_${adv.id}`}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 truncate">{adv.employee_name}</div>
                      <div className="text-xs text-slate-500">
                        {formatDate(adv.date)} • {adv.reason || 'Personal'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm text-amber-600">{formatCurrency(adv.amount)}</div>
                      <div className="text-xs">
                        {remaining > 0 ? (
                          <span className="badge badge-warning">{formatCurrency(remaining)}</span>
                        ) : (
                          <span className="badge badge-success">Settled</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="table-responsive hidden md:block">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {recentAdvances.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                      No advance disbursements recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentAdvances.map((adv) => {
                    const remaining = parseFloat(adv.amount) - parseFloat(adv.settled_amount);
                    return (
                      <tr key={adv.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{adv.employee_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{adv.reason || 'Personal'}</div>
                        </td>
                        <td>
                          <strong style={{ color: '#d97706' }}>{formatCurrency(adv.amount)}</strong>
                        </td>
                        <td>{formatDate(adv.date)}</td>
                        <td>
                          {remaining > 0 ? (
                            <span className="badge badge-warning">{formatCurrency(remaining)}</span>
                          ) : (
                            <span className="badge badge-success">Settled</span>
                          )}
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
    </div>
  );
}
