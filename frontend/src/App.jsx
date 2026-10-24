import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { GuestRoute, ProtectedRoute, RoleRoute } from './routes/guards';
import AppLayout from './layouts/AppLayout';
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const UsersList = lazy(() => import('./pages/users/UsersList'));
const UserForm = lazy(() => import('./pages/users/UserForm'));
const Roles = lazy(() => import('./pages/roles/Roles'));
const EmployeesList = lazy(() => import('./pages/employees/EmployeesList'));
const EmployeeForm = lazy(() => import('./pages/employees/EmployeeForm'));
const EmployeeDetail = lazy(() => import('./pages/employees/EmployeeDetail'));
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'));
const AttendanceForm = lazy(() => import('./pages/attendance/AttendanceForm'));
const AccountsList = lazy(() => import('./pages/accounts/AccountsList'));
const AccountForm = lazy(() => import('./pages/accounts/AccountForm'));
const AccountDetail = lazy(() => import('./pages/accounts/AccountDetail'));
const ExpensesList = lazy(() => import('./pages/expenses/ExpensesList'));
const ExpenseForm = lazy(() => import('./pages/expenses/ExpenseForm'));
const CategoriesList = lazy(() => import('./pages/categories/CategoriesList'));
const CategoryForm = lazy(() => import('./pages/categories/CategoryForm'));
const AdvancesList = lazy(() => import('./pages/advances/AdvancesList'));
const AdvanceForm = lazy(() => import('./pages/advances/AdvanceForm'));
const AdvanceDetail = lazy(() => import('./pages/advances/AdvanceDetail'));
const PayrollList = lazy(() => import('./pages/payroll/PayrollList'));
const PayrollDetail = lazy(() => import('./pages/payroll/PayrollDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
