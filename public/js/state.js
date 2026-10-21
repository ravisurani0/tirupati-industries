// Centralized Application State and Wizard Configuration

export const AppState = {
  currentUser: null,
  currentTab: 'dashboard',
  currentRoute: '/dashboard',
  employees: [],
  dailyAttendance: [],
  currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  attendanceDate: new Date().toISOString().split('T')[0],
  payrollData: null,
  advances: [],
  listeners: new Map()
};

export const WizardState = {
  emp: { current: 1, max: 2 },
  adv: { current: 1, max: 2 },
  pay: { current: 1, max: 2 },
  admin: { current: 1, max: 2 }
};

// Simple event bus / state change subscriber
export function subscribe(event, callback) {
  if (!AppState.listeners.has(event)) {
    AppState.listeners.set(event, new Set());
  }
  AppState.listeners.get(event).add(callback);
  return () => AppState.listeners.get(event).delete(callback);
}

export function emit(event, data) {
  if (AppState.listeners.has(event)) {
    AppState.listeners.get(event).forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in state event listener for "${event}":`, err);
      }
    });
  }
}
