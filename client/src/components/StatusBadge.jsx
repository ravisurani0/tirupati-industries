import React from 'react';

export default function StatusBadge({ status = '', label }) {
  const s = String(status).toLowerCase().trim();

  let badgeClass = 'badge-neutral';
  let text = label || status;

  switch (s) {
    case 'present':
      badgeClass = 'badge-success';
      text = label || 'Present';
      break;
    case 'half_day':
    case 'half day':
      badgeClass = 'badge-warning';
      text = label || 'Half-Day';
      break;
    case 'absent':
      badgeClass = 'badge-danger';
      text = label || 'Absent';
      break;
    case 'paid_leave':
    case 'paid leave':
      badgeClass = 'badge-fixed';
      text = label || 'Paid Leave';
      break;
    case 'active':
      badgeClass = 'badge-success';
      text = label || 'Active';
      break;
    case 'inactive':
      badgeClass = 'badge-neutral';
      text = label || 'Inactive';
      break;
    case 'paid':
      badgeClass = 'badge-success';
      text = label || 'Fully Paid';
      break;
    case 'partially_paid':
    case 'partial':
      badgeClass = 'badge-warning';
      text = label || 'Partial';
      break;
    case 'unpaid':
      badgeClass = 'badge-danger';
      text = label || 'Unpaid';
      break;
    case 'settled':
      badgeClass = 'badge-success';
      text = label || 'Settled';
      break;
    case 'unsettled':
      badgeClass = 'badge-danger';
      text = label || 'Unsettled';
      break;
    case 'fixed':
      badgeClass = 'badge-fixed';
      text = label || 'Fixed Monthly';
      break;
    case 'hourly':
      badgeClass = 'badge-hourly';
      text = label || 'Hourly Wage';
      break;
    default:
      badgeClass = 'badge-neutral';
      text = label || status || 'N/A';
  }

  return <span className={`badge ${badgeClass}`}>{text}</span>;
}
