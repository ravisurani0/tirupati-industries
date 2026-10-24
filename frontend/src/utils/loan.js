/**
 * Mirrors backend/src/services/advance.service.js so the form can preview the
 * figures before saving. The server recalculates and stores the real values.
 */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Advance: settled from the transfer month's salary. Loan: simple interest at rate% per year, equal monthly installments from the next month. */
export function calculate({ amount, transferDate, isLoan, rate, months }) {
  const a = Number(amount);
  if (!a || !transferDate) return null;
  const transferMonth = transferDate.slice(0, 7);
  if (!isLoan) return { interest_amount: 0, total_repayable: round2(a), monthly_installment: round2(a), repayment_start_month: transferMonth, installments: 1 };
  const r = Number(rate);
  const n = Number(months);
  if (Number.isNaN(r) || !n || n < 1) return null;
  const interest = round2((a * r * n) / 100 / 12);
  const total = round2(a + interest);
  return { interest_amount: interest, total_repayable: total, monthly_installment: round2(total / n), repayment_start_month: addMonths(transferMonth, 1), installments: n };
}

export function schedule({ total_repayable: total, monthly_installment: emi, repayment_start_month: start, installments: n }) {
  const out = [];
  let remaining = total;
  for (let i = 0; i < n; i += 1) {
    const due = i === n - 1 ? round2(remaining) : emi;
    remaining = round2(remaining - due);
    out.push({ number: i + 1, month: addMonths(start, i), amount: due, balance_after: remaining });
  }
  return out;
}

/** "Nov 2026" for YYYY-MM */
export function formatMonth(month) {
  if (!month) return '—';
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}
