import React, { useEffect, useState, useCallback } from 'react';
import { attendanceApi, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { CheckCircle2, Save, Calendar, Clock } from 'lucide-react';

export default function AttendancePage() {
  const { showToast } = useApp();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);

  const [date, setDate] = useState(todayStr);
  const [summaryMonth, setSummaryMonth] = useState(currentMonthStr);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [totalMonthDays, setTotalMonthDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch daily attendance
  const fetchDaily = useCallback(async (targetDate) => {
    try {
      setLoading(true);
      const data = await attendanceApi.getByDate(targetDate);
      setDailyRecords(
        (data.attendance || []).map((row) => ({
          ...row,
          status: row.status || 'present',
          hours_worked:
            row.hours_worked !== null
              ? row.hours_worked
              : row.employment_type === 'hourly'
              ? row.standard_hours_per_day
              : 8,
          overtime_hours: row.overtime_hours || 0,
          notes: row.notes || ''
        }))
      );
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Fetch monthly summary matrix
  const fetchMonthly = useCallback(async (targetMonth) => {
    try {
      const data = await attendanceApi.getMonthlySummary(targetMonth);
      setMonthlySummary(data.summary || []);
      setTotalMonthDays(data.totalDaysInMonth || 30);
    } catch (err) {
      console.error('Failed to load monthly summary:', err);
    }
  }, []);

  useEffect(() => {
    fetchDaily(date);
  }, [date, fetchDaily]);

  useEffect(() => {
    fetchMonthly(summaryMonth);
  }, [summaryMonth, fetchMonthly]);

  const handleStatusChange = (empId, newStatus) => {
    setDailyRecords((prev) =>
      prev.map((r) => (r.employee_id === empId ? { ...r, status: newStatus } : r))
    );
  };

  const handleHoursChange = (empId, field, val) => {
    setDailyRecords((prev) =>
      prev.map((r) => (r.employee_id === empId ? { ...r, [field]: parseFloat(val) || 0 } : r))
    );
  };

  const handleNotesChange = (empId, notes) => {
    setDailyRecords((prev) =>
      prev.map((r) => (r.employee_id === empId ? { ...r, notes } : r))
    );
  };

  const markAllPresent = () => {
    setDailyRecords((prev) => prev.map((r) => ({ ...r, status: 'present' })));
    showToast('Marked all employees as Present for this date.');
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const records = dailyRecords.map((r) => ({
        employee_id: r.employee_id,
        status: r.status,
        hours_worked: r.hours_worked,
        overtime_hours: r.overtime_hours,
        notes: r.notes
      }));

      await attendanceApi.saveBulk(date, records);
      showToast(`Daily attendance saved for ${formatDate(date)} (${records.length} staff)`);
      fetchMonthly(summaryMonth);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Daily Attendance DataTable columns
  const dailyColumns = [
    {
      key: 'name',
      label: 'Staff Member',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.name}</div>
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
      label: 'Attendance Status',
      sortable: true,
      render: (row) => (
        <div className="attendance-radio-group">
          <input
            type="radio"
            id={`p_${row.employee_id}`}
            name={`st_${row.employee_id}`}
            value="present"
            checked={row.status === 'present'}
            onChange={() => handleStatusChange(row.employee_id, 'present')}
          />
          <label htmlFor={`p_${row.employee_id}`}>Present</label>

          <input
            type="radio"
            id={`h_${row.employee_id}`}
            name={`st_${row.employee_id}`}
            value="half_day"
            checked={row.status === 'half_day'}
            onChange={() => handleStatusChange(row.employee_id, 'half_day')}
          />
          <label htmlFor={`h_${row.employee_id}`}>Half-Day (0.5)</label>

          <input
            type="radio"
            id={`a_${row.employee_id}`}
            name={`st_${row.employee_id}`}
            value="absent"
            checked={row.status === 'absent'}
            onChange={() => handleStatusChange(row.employee_id, 'absent')}
          />
          <label htmlFor={`a_${row.employee_id}`}>Absent (0)</label>

          <input
            type="radio"
            id={`l_${row.employee_id}`}
            name={`st_${row.employee_id}`}
            value="paid_leave"
            checked={row.status === 'paid_leave'}
            onChange={() => handleStatusChange(row.employee_id, 'paid_leave')}
          />
          <label htmlFor={`l_${row.employee_id}`}>Paid Leave</label>
        </div>
      )
    },
    {
      key: 'hours_worked',
      label: 'Shift Hours',
      sortable: true,
      sortValue: (row) => parseFloat(row.hours_worked) || 0,
      render: (row) => (
        <input
          type="number"
          step="0.5"
          min="0"
          max="24"
          className="form-control"
          style={{ width: '85px', fontWeight: 600 }}
          value={row.hours_worked}
          onChange={(e) => handleHoursChange(row.employee_id, 'hours_worked', e.target.value)}
        />
      )
    },
    {
      key: 'overtime_hours',
      label: 'OT (Hrs)',
      sortable: true,
      sortValue: (row) => parseFloat(row.overtime_hours) || 0,
      render: (row) => (
        <input
          type="number"
          step="0.5"
          min="0"
          max="16"
          className="form-control"
          style={{ width: '75px' }}
          value={row.overtime_hours}
          onChange={(e) => handleHoursChange(row.employee_id, 'overtime_hours', e.target.value)}
        />
      )
    },
    {
      key: 'notes',
      label: 'Shift Notes',
      sortable: false,
      render: (row) => (
        <input
          type="text"
          className="form-control"
          style={{ width: '160px', fontSize: '12px' }}
          placeholder="Shift note..."
          value={row.notes}
          onChange={(e) => handleNotesChange(row.employee_id, e.target.value)}
        />
      )
    }
  ];

  // Daily Attendance Mobile Card
  const renderDailyCard = (row) => (
    <div className="att-mobile-card" key={`att_card_${row.employee_id}`}>
      <div className="wmc-header">
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{row.name}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{row.designation}</div>
        </div>
        <StatusBadge status={row.employment_type} />
      </div>

      <div className="att-status-pills">
        <button
          type="button"
          className={`att-status-pill ${row.status === 'present' ? 'active-present' : ''}`}
          onClick={() => handleStatusChange(row.employee_id, 'present')}
        >
          Present (1.0)
        </button>
        <button
          type="button"
          className={`att-status-pill ${row.status === 'half_day' ? 'active-half_day' : ''}`}
          onClick={() => handleStatusChange(row.employee_id, 'half_day')}
        >
          Half-Day (0.5)
        </button>
        <button
          type="button"
          className={`att-status-pill ${row.status === 'absent' ? 'active-absent' : ''}`}
          onClick={() => handleStatusChange(row.employee_id, 'absent')}
        >
          Absent (0)
        </button>
        <button
          type="button"
          className={`att-status-pill ${row.status === 'paid_leave' ? 'active-paid_leave' : ''}`}
          onClick={() => handleStatusChange(row.employee_id, 'paid_leave')}
        >
          Paid Leave
        </button>
      </div>

      <div className="att-inputs-grid">
        <div className="att-input-box">
          <label>Shift Hours</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            className="form-control"
            value={row.hours_worked}
            onChange={(e) => handleHoursChange(row.employee_id, 'hours_worked', e.target.value)}
          />
        </div>
        <div className="att-input-box">
          <label>Overtime (OT)</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="16"
            className="form-control"
            value={row.overtime_hours}
            onChange={(e) => handleHoursChange(row.employee_id, 'overtime_hours', e.target.value)}
          />
        </div>
      </div>

      <div className="att-input-box">
        <label>Shift Note</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Overtime on lathe, early departure..."
          value={row.notes}
          onChange={(e) => handleNotesChange(row.employee_id, e.target.value)}
        />
      </div>
    </div>
  );

  // Monthly Matrix Columns
  const monthlyColumns = [
    {
      key: 'name',
      label: 'Staff Member',
      sortable: true,
      render: (s) => (
        <div>
          <div className="font-bold text-slate-900">{s.name}</div>
          <div className="text-xs text-slate-500">{s.designation}</div>
        </div>
      )
    },
    {
      key: 'employment_type',
      label: 'Type',
      sortable: true,
      render: (s) => <StatusBadge status={s.employment_type} />
    },
    {
      key: 'present_days',
      label: 'Present',
      sortable: true,
      sortValue: (s) => parseFloat(s.present_days) || 0,
      render: (s) => <strong className="text-emerald-600 font-bold">{s.present_days}</strong>
    },
    {
      key: 'half_days',
      label: 'Half-Days',
      sortable: true,
      sortValue: (s) => parseFloat(s.half_days) || 0,
      render: (s) => <strong className="text-amber-600 font-bold">{s.half_days}</strong>
    },
    {
      key: 'absent_days',
      label: 'Absent',
      sortable: true,
      sortValue: (s) => parseFloat(s.absent_days) || 0,
      render: (s) => <strong className="text-red-600 font-bold">{s.absent_days}</strong>
    },
    {
      key: 'paid_leaves',
      label: 'Leaves',
      sortable: true,
      sortValue: (s) => parseFloat(s.paid_leaves) || 0,
      render: (s) => <strong className="text-blue-600 font-bold">{s.paid_leaves}</strong>
    },
    {
      key: 'effective_working_days',
      label: 'Working Units',
      sortable: true,
      sortValue: (s) => parseFloat(s.effective_working_days) || 0,
      render: (s) => (
        <span className="badge badge-neutral font-extrabold text-xs">
          {s.effective_working_days} / {totalMonthDays} Days
        </span>
      )
    },
    {
      key: 'total_hours_worked',
      label: 'Total Shift Hours',
      sortable: true,
      sortValue: (s) => parseFloat(s.total_hours_worked) || 0,
      render: (s) => (
        <div>
          <strong>{s.total_hours_worked} hrs</strong>
          {parseFloat(s.total_overtime_hours) > 0 && (
            <span className="text-xs text-amber-600 font-semibold ml-1">
              (+{s.total_overtime_hours} OT)
            </span>
          )}
        </div>
      )
    }
  ];

  // Monthly Matrix Mobile Card
  const renderMonthlyCard = (s) => (
    <div key={`m_card_${s.employee_id}`} className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm mb-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-bold text-sm text-slate-900">{s.name}</div>
          <div className="text-xs text-slate-500">{s.designation}</div>
        </div>
        <StatusBadge status={s.employment_type} />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center mt-3 pt-2 border-t border-slate-100">
        <div>
          <div className="text-[11px] text-slate-400">Present</div>
          <div className="font-bold text-emerald-600">{s.present_days}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Half</div>
          <div className="font-bold text-amber-600">{s.half_days}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Absent</div>
          <div className="font-bold text-red-600">{s.absent_days}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Leaves</div>
          <div className="font-bold text-blue-600">{s.paid_leaves}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-100">
        <span className="badge badge-neutral font-bold">{s.effective_working_days} / {totalMonthDays} Days</span>
        <span className="font-semibold text-slate-700">{s.total_hours_worked} hrs {parseFloat(s.total_overtime_hours) > 0 ? `(+${s.total_overtime_hours} OT)` : ''}</span>
      </div>
    </div>
  );

  return (
    <div>
      {/* Date Bar & Actions */}
      <div className="action-banner flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="flex items-center gap-2">
            <Calendar size={18} color="#2563eb" />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Attendance Date:</span>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <span className="badge badge-neutral">{dailyRecords.length} Staff</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            className="btn btn-outline btn-sm flex-1 sm:flex-initial justify-center"
            onClick={markAllPresent}
          >
            <CheckCircle2 size={15} />
            <span>Mark All Present</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm flex-1 sm:flex-initial justify-center"
            onClick={handleSaveAttendance}
            disabled={saving}
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      {/* Daily Attendance DataTable Card */}
      <div className="card mb-6">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3>Daily Workshop Log • {formatDate(date)}</h3>
            <span className="text-xs text-slate-500">
              Interactive check-in ledger with live search, column sorting and batch status updates
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <DataTable
            data={dailyRecords}
            columns={dailyColumns}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search staff by name or designation..."
            pagination={true}
            pageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            initialSort={{ key: 'name', direction: 'asc' }}
            renderCard={renderDailyCard}
            emptyMessage="No active employees found for this date."
          />
        </div>
      </div>

      {/* Floating Save Bar on Mobile */}
      <div className="sticky-mobile-save-bar">
        <span>Daily Log • {dailyRecords.length} Staff</span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSaveAttendance}
          disabled={saving}
        >
          <Save size={15} />
          <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
        </button>
      </div>

      {/* Monthly Attendance Matrix DataTable */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="#2563eb" />
            <div>
              <h3>Monthly Attendance Matrix & Accumulated Hours</h3>
              <span className="text-xs text-slate-500">
                Monthly aggregate units, overtime hours, present and absent breakdowns
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Month:</span>
            <input
              type="month"
              className="form-control form-control-sm"
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <DataTable
            data={monthlySummary}
            columns={monthlyColumns}
            searchable={true}
            searchPlaceholder="Search matrix by staff name..."
            pagination={true}
            pageSize={10}
            pageSizeOptions={[10, 25, 50]}
            initialSort={{ key: 'effective_working_days', direction: 'desc' }}
            renderCard={renderMonthlyCard}
            emptyMessage={`No staff attendance records logged for ${summaryMonth}.`}
          />
        </div>
      </div>
    </div>
  );
}

