import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { GuestRoute, ProtectedRoute, RoleRoute } from './routes/guards';
import AppLayout from './layouts/AppLayout';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import UsersList from './pages/users/UsersList';
import UserForm from './pages/users/UserForm';
import Roles from './pages/roles/Roles';
import EmployeesList from './pages/employees/EmployeesList';
import EmployeeForm from './pages/employees/EmployeeForm';
import EmployeeDetail from './pages/employees/EmployeeDetail';
import AttendancePage from './pages/attendance/AttendancePage';
import AttendanceForm from './pages/attendance/AttendanceForm';
import AccountsList from './pages/accounts/AccountsList';
import AccountForm from './pages/accounts/AccountForm';
import AccountDetail from './pages/accounts/AccountDetail';
import ExpensesList from './pages/expenses/ExpensesList';
import ExpenseForm from './pages/expenses/ExpenseForm';
import CategoriesList from './pages/categories/CategoriesList';
import CategoryForm from './pages/categories/CategoryForm';
import AdvancesList from './pages/advances/AdvancesList';
import AdvanceForm from './pages/advances/AdvanceForm';
import AdvanceDetail from './pages/advances/AdvanceDetail';
import PayrollList from './pages/payroll/PayrollList';
import PayrollDetail from './pages/payroll/PayrollDetail';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />

                <Route element={<RoleRoute roles={['admin', 'manager']} />}>
                  <Route path="/employees" element={<EmployeesList />} />
                  <Route path="/employees/new" element={<EmployeeForm />} />
                  <Route path="/employees/:id" element={<EmployeeDetail />} />
                  <Route path="/employees/:id/edit" element={<EmployeeForm />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/attendance/new" element={<AttendanceForm />} />
                  <Route path="/attendance/:id/edit" element={<AttendanceForm />} />
                  <Route path="/accounts" element={<AccountsList />} />
                  <Route path="/accounts/:id" element={<AccountDetail />} />
                  <Route path="/expenses" element={<ExpensesList />} />
                  <Route path="/expenses/new" element={<ExpenseForm />} />
                  <Route path="/expenses/:id/edit" element={<ExpenseForm />} />
                  <Route path="/expense-categories" element={<CategoriesList />} />
                  <Route path="/expense-categories/new" element={<CategoryForm />} />
                  <Route path="/expense-categories/:id/edit" element={<CategoryForm />} />
                </Route>

                <Route element={<RoleRoute roles={['admin']} />}>
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/users/new" element={<UserForm />} />
                  <Route path="/users/:id/edit" element={<UserForm />} />
                  <Route path="/roles" element={<Roles />} />
                  <Route path="/accounts/new" element={<AccountForm />} />
                  <Route path="/accounts/:id/edit" element={<AccountForm />} />
                  <Route path="/advances" element={<AdvancesList />} />
                  <Route path="/advances/new" element={<AdvanceForm />} />
                  <Route path="/advances/:id" element={<AdvanceDetail />} />
                  <Route path="/advances/:id/edit" element={<AdvanceForm />} />
                  <Route path="/payroll" element={<PayrollList />} />
                  <Route path="/payroll/:employeeId" element={<PayrollDetail />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
