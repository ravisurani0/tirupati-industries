import React from 'react';
import { Users, Clock, DollarSign, FileText, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

const iconMap = {
  users: Users,
  clock: Clock,
  rupee: DollarSign,
  file: FileText,
  check: CheckCircle2,
  trend: TrendingUp,
  alert: AlertCircle
};

export default function StatCard({ title, value, sub, icon = 'trend', variant = 'primary' }) {
  const IconComponent = iconMap[icon] || TrendingUp;

  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-info">
        <p>{title}</p>
        <h3>{value}</h3>
        {sub && <div className="sub-stat">{sub}</div>}
      </div>
      <div className="stat-icon">
        <IconComponent size={22} />
      </div>
    </div>
  );
}
