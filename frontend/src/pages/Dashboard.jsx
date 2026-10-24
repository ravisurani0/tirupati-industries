import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { employeesApi, usersApi } from '../api';
import Avatar from '../components/ui/Avatar';
import { Badge, roleBadgeColor } from '../components/ui/Feedback';
import { formatDate } from '../utils/format';
import { BriefcaseIcon, CheckCircleIcon, MailIcon, ShieldIcon, UsersIcon } from '../components/common/icons';

function MetricCard({ icon: Icon, label, value, hint, to }) {
  const body = (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-colors md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
        <Icon />
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {label}
          {hint && <span className="text-theme-xs ml-1.5 text-gray-400">({hint})</span>}
        </span>
        <h4 className="text-title-sm mt-2 font-bold text-gray-800 dark:text-white/90">{value ?? '—'}</h4>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block hover:[&>div]:border-brand-300 dark:hover:[&>div]:border-brand-800">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [stats, setStats] = useState(null);
  const [empStats, setEmpStats] = useState(null);

  useEffect(() => {
    employeesApi
      .stats()
      .then((r) => setEmpStats(r.data))
      .catch(() => setEmpStats(null));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    usersApi
      .stats()
      .then((r) => setStats(r.data))
      .catch(() => setStats(null));
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <Avatar user={user} size="lg" className="border border-gray-200 dark:border-gray-800" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Welcome back, {user.first_name}!</h2>
            <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm break-all text-gray-500 dark:text-gray-400">
                <MailIcon size={16} /> {user.email}
              </span>
              <Badge color={roleBadgeColor(user.role?.slug)}>{user.role?.name}</Badge>
            </div>
          </div>
          <Link
            to="/profile"
            className="shadow-theme-xs inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            View profile
          </Link>
        </div>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
          <MetricCard icon={BriefcaseIcon} label="Employees" value={empStats && `${empStats.active_employees} / ${empStats.total_employees}`} hint="active / total" to="/employees" />
          <MetricCard icon={UsersIcon} label="Total users" value={stats?.total_users} to="/users" />
          <MetricCard icon={CheckCircleIcon} label="Active users" value={stats?.active_users} to="/users" />
          <MetricCard icon={ShieldIcon} label="Roles" value={stats?.total_roles} to="/roles" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
          <MetricCard icon={BriefcaseIcon} label="Employees" value={empStats && `${empStats.active_employees} / ${empStats.total_employees}`} hint="active / total" to="/employees" />
          <MetricCard icon={ShieldIcon} label="Your role" value={user.role?.name} />
          <MetricCard icon={CheckCircleIcon} label="Last sign in" value={<span className="text-lg font-semibold">{formatDate(user.last_login_at)}</span>} />
        </div>
      )}
    </div>
  );
}

