import React, { useEffect, useState, useCallback } from 'react';
import { attendanceApi, formatDate } from '../api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { CheckCircle2, Save, Calendar, Clock, LayoutGrid, List } from 'lucide-react';

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

  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'cards', 'table'

  return (
    <div>
      {/* Date Bar & Actions */}
      <div className="action-banner flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
          <button type="button" className="btn btn-outline btn-sm flex-1 sm:flex-initial justify-center" onClick={markAllPresent}>
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

      {/* Daily Attendance Grid */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3>Daily Workshop Log • {formatDate(date)}</h3>
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

        {/* Mobile Touch Cards View - ONLY visible on mobile screens unless explicitly toggled to cards */}
        <div className={`mobile-cards-list ${viewMode === 'cards' ? 'force-cards' : viewMode === 'table' ? 'hidden' : ''}`}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              Loading daily log...
            </div>
          ) : dailyRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              No active employees found for this date.
            </div>
          ) : (
            dailyRecords.map((row) => (
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
            ))
          )}
        </div>

        {/* Desktop Table View - ONLY visible on md and up unless explicitly toggled to table */}
        <div className={`table-responsive ${viewMode === 'cards' ? 'force-hidden' : viewMode === 'table' ? 'force-table' : 'hidden md:block'}`}>
          <table className="app-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Wage Type</th>
                <th>Attendance Status</th>
                <th>Shift Hours</th>
                <th>OT (Hrs)</th>
                <th>Shift Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading daily log...
                  </td>
                </tr>
              ) : dailyRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No active employees found for this date.
                  </td>
                </tr>
              ) : (
                dailyRecords.map((row) => (
                  <tr key={row.employee_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{row.designation}</div>
                    </td>
                    <td>
                      <StatusBadge status={row.employment_type} />
                    </td>
                    <td>
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
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        className="form-control"
                        style={{ width: '85px', fontWeight: 600 }}
                        value={row.hours_worked}
                        onChange={(e) =>
                          handleHoursChange(row.employee_id, 'hours_worked', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="16"
                        className="form-control"
                        style={{ width: '75px' }}
                        value={row.overtime_hours}
                        onChange={(e) =>
                          handleHoursChange(row.employee_id, 'overtime_hours', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '150px', fontSize: '12px' }}
                        placeholder="Shift note..."
                        value={row.notes}
                        onChange={(e) => handleNotesChange(row.employee_id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      {/* Monthly Attendance Matrix */}
      <div className="card" style={{ marginTop: '30px' }}>
        <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="#2563eb" />
            <h3>Monthly Attendance Matrix & Accumulated Hours</h3>
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

        <div className="table-responsive">
          <table className="app-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Type</th>
                <th>Present</th>
                <th>Half-Days</th>
                <th>Absent</th>
                <th>Leaves</th>
                <th>Working Units</th>
                <th>Total Shift Hours</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                    No staff attendance records logged for {summaryMonth}.
                  </td>
                </tr>
              ) : (
                monthlySummary.map((s) => (
                  <tr key={s.employee_id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{s.designation}</div>
                    </td>
                    <td>
                      <StatusBadge status={s.employment_type} />
                    </td>
                    <td><strong style={{ color: '#059669' }}>{s.present_days}</strong></td>
                    <td><strong style={{ color: '#d97706' }}>{s.half_days}</strong></td>
                    <td><strong style={{ color: '#dc2626' }}>{s.absent_days}</strong></td>
                    <td><strong style={{ color: '#2563eb' }}>{s.paid_leaves}</strong></td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontWeight: 800 }}>
                        {s.effective_working_days} / {totalMonthDays} Days
                      </span>
                    </td>
                    <td>
                      <strong>{s.total_hours_worked} hrs</strong>
                      {parseFloat(s.total_overtime_hours) > 0 && (
                        <span style={{ fontSize: '11px', color: '#d97706', marginLeft: '4px' }}>
                          (+{s.total_overtime_hours} OT)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
