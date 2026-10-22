// src/utils/loanCalculator.js
// Utility for calculating staff loan interest, daily summaries, and repayment balances

function parseDateOnly(d) {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  const str = String(d).split('T')[0];
  const [y, m, day] = str.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function formatDateStr(d) {
  const dt = parseDateOnly(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function diffDays(startDate, endDate) {
  const d1 = parseDateOnly(startDate);
  const d2 = parseDateOnly(endDate);
  const ms = d2.getTime() - d1.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates complete loan financial statistics including daily summary,
 * accrued interest, repayments, and remaining balance.
 */
function calculateLoanDetails(loan, repayments = [], asOfDateInput = null) {
  const principal = parseFloat(loan.amount) || 0;
  const interestRate = parseFloat(loan.interest_rate) || 0;
  const interestType = loan.interest_type || 'monthly'; // 'daily', 'monthly', 'yearly'
  const disbursementDateStr = formatDateStr(loan.date);
  const asOfDateStr = asOfDateInput ? formatDateStr(asOfDateInput) : formatDateStr(new Date());

  // Normalized rates
  let dailyRatePct = 0;
  let monthlyRatePct = 0;
  let yearlyRatePct = 0;

  if (interestType === 'daily') {
    dailyRatePct = interestRate;
    monthlyRatePct = interestRate * 30;
    yearlyRatePct = interestRate * 365;
  } else if (interestType === 'yearly') {
    yearlyRatePct = interestRate;
    monthlyRatePct = interestRate / 12;
    dailyRatePct = interestRate / 365;
  } else {
    // monthly default
    monthlyRatePct = interestRate;
    dailyRatePct = interestRate / 30;
    yearlyRatePct = interestRate * 12;
  }

  const daysElapsed = diffDays(disbursementDateStr, asOfDateStr);
  const dailyInterestOnPrincipal = Math.round((principal * (dailyRatePct / 100)) * 100) / 100;
  const monthlyInterestOnPrincipal = Math.round((principal * (monthlyRatePct / 100)) * 100) / 100;
  const yearlyInterestOnPrincipal = Math.round((principal * (yearlyRatePct / 100)) * 100) / 100;

  // Process repayments sorted by date ascending
  const sortedRepayments = [...repayments].sort((a, b) => {
    const da = new Date(a.repayment_date || a.date);
    const db = new Date(b.repayment_date || b.date);
    return da - db;
  });

  const totalRepaid = Math.round(
    sortedRepayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0) * 100
  ) / 100;

  // Interest calculation across intervals (reducing balance)
  let currentPrincipal = principal;
  let lastDateStr = disbursementDateStr;
  let totalAccruedInterest = 0;
  const calculationIntervals = [];

  for (const rep of sortedRepayments) {
    const repDateStr = formatDateStr(rep.repayment_date || rep.date);
    // Only calculate interval up to asOfDate
    const intervalEndDate = repDateStr <= asOfDateStr ? repDateStr : asOfDateStr;
    const intervalDays = diffDays(lastDateStr, intervalEndDate);

    if (intervalDays > 0 && currentPrincipal > 0) {
      const intervalInterest = Math.round(
        (currentPrincipal * (dailyRatePct / 100) * intervalDays) * 100
      ) / 100;
      totalAccruedInterest += intervalInterest;

      calculationIntervals.push({
        startDate: lastDateStr,
        endDate: intervalEndDate,
        days: intervalDays,
        principalBase: currentPrincipal,
        dailyRatePct,
        interestAccrued: intervalInterest,
        event: 'Interest Accrual'
      });
    }

    const repAmount = parseFloat(rep.amount) || 0;
    calculationIntervals.push({
      date: repDateStr,
      repaymentAmount: repAmount,
      paymentMode: rep.payment_mode,
      notes: rep.notes,
      event: 'Repayment Received'
    });

    // Reduce balance
    currentPrincipal = Math.max(0, currentPrincipal - repAmount);
    lastDateStr = intervalEndDate;

    if (lastDateStr >= asOfDateStr) break;
  }

  // Final interval from last event to asOfDate
  if (lastDateStr < asOfDateStr && currentPrincipal > 0) {
    const finalDays = diffDays(lastDateStr, asOfDateStr);
    if (finalDays > 0) {
      const finalInterest = Math.round(
        (currentPrincipal * (dailyRatePct / 100) * finalDays) * 100
      ) / 100;
      totalAccruedInterest += finalInterest;

      calculationIntervals.push({
        startDate: lastDateStr,
        endDate: asOfDateStr,
        days: finalDays,
        principalBase: currentPrincipal,
        dailyRatePct,
        interestAccrued: finalInterest,
        event: 'Current Period Accrual'
      });
    }
  }

  // If simple interest on full principal across all days is needed as comparison:
  const simpleInterestTotal = Math.round(
    (principal * (dailyRatePct / 100) * daysElapsed) * 100
  ) / 100;

  totalAccruedInterest = Math.round(totalAccruedInterest * 100) / 100;
  const totalPayable = Math.round((principal + totalAccruedInterest) * 100) / 100;
  const remainingBalance = Math.max(0, Math.round((totalPayable - totalRepaid) * 100) / 100);

  let status = 'unsettled';
  if (remainingBalance <= 0 && (totalRepaid >= principal || sortedRepayments.length > 0)) {
    status = 'settled';
  } else if (totalRepaid > 0) {
    status = 'partially_settled';
  }

  return {
    loanId: loan.id,
    type: 'loan',
    principalAmount: principal,
    disbursementDate: disbursementDateStr,
    asOfDate: asOfDateStr,
    daysElapsed,
    interestRate,
    interestType,
    rates: {
      dailyRatePct: parseFloat(dailyRatePct.toFixed(4)),
      monthlyRatePct: parseFloat(monthlyRatePct.toFixed(2)),
      yearlyRatePct: parseFloat(yearlyRatePct.toFixed(2))
    },
    dailyInterestAmount: dailyInterestOnPrincipal,
    monthlyInterestAmount: monthlyInterestOnPrincipal,
    yearlyInterestAmount: yearlyInterestOnPrincipal,
    totalAccruedInterest,
    simpleInterestTotal,
    totalPayable,
    totalRepaid,
    remainingBalance,
    repaymentsCount: sortedRepayments.length,
    repayments: sortedRepayments,
    status,
    calculationIntervals
  };
}

/**
 * Calculates next month string formatted as 'YYYY-MM' from a given date.
 */
function getNextMonth(dateInput) {
  const dt = parseDateOnly(dateInput);
  const y = dt.getFullYear();
  const m = dt.getMonth(); // 0-indexed
  const nextDt = new Date(y, m + 1, 1);
  const nextY = nextDt.getFullYear();
  const nextM = String(nextDt.getMonth() + 1).padStart(2, '0');
  return `${nextY}-${nextM}`;
}

module.exports = {
  calculateLoanDetails,
  getNextMonth,
  diffDays,
  formatDateStr
};
