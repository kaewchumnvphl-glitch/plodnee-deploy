import {
  DebtItem,
  IncomeItem,
  MonthlyDebtSlice,
  PayoffStrategy,
  RatePeriod,
  SimulationMonth,
  SimulationResult,
} from '../types/finance';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export function formatTHB(value: number, decimals = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  return (
    new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safe) + ' ฿'
  );
}

export function formatNumber(value: number, decimals = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safe);
}

export function formatCompactTHB(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} ลบ.`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)} พัน`;
  }
  return `${Math.round(value)} ฿`;
}

export function formatDurationThai(months: number): string {
  if (months <= 0) return 'ปลอดหนี้แล้ว';
  if (months >= 360) return 'มากกว่า 30 ปี';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} เดือน`;
  if (rem === 0) return `${years} ปี`;
  return `${years} ปี ${rem} เดือน`;
}

export function getCurrentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getThaiMonthLabel(offsetMonths: number, baseDate = new Date()): {
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
} {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + offsetMonths, 1);
  const yearBE = d.getFullYear() + 543;
  const monthIdx = d.getMonth();
  const monthKey = `${d.getFullYear()}-${String(monthIdx + 1).padStart(2, '0')}`;
  return {
    monthKey,
    shortLabel: `${THAI_MONTHS_SHORT[monthIdx]} ${String(yearBE).slice(-2)}`,
    fullLabel: `${THAI_MONTHS_FULL[monthIdx]} ${yearBE}`,
  };
}

export function formatThaiDate(date: Date): string {
  return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export function toAnnualRate(rateInput: number, period: RatePeriod): number {
  const safe = Math.max(0, Number(rateInput) || 0);
  if (period === 'year') return safe;
  if (period === 'month') return safe * 12;
  return safe * 365;
}

export function getMonthlyIncomeAmount(item: IncomeItem): number {
  const amt = Math.max(0, Number(item.amount) || 0);
  if (item.frequency === 'monthly') return amt;
  if (item.frequency === 'weekly') return (amt * 52) / 12;
  return amt / 12;
}

export function getMonthlyInterestEstimate(debt: DebtItem): number {
  const principal = Math.max(0, debt.principal);
  if (principal <= 0 || debt.annualRate <= 0) return 0;
  return (principal * (debt.annualRate / 100)) / 12;
}

export type DueStatus = 'paid' | 'overdue' | 'today' | 'soon' | 'upcoming';

export interface DebtDueInfo {
  status: DueStatus;
  daysDiff: number; // negative = overdue days, 0 = today, positive = days left
  dueDateThisMonth: Date;
  statusLabel: string;
}

export function getDebtDueInfo(
  debt: DebtItem,
  leadDays: number,
  now = new Date()
): DebtDueInfo {
  const monthKey = getCurrentMonthKey(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(Math.max(1, debt.dueDay || 1), daysInMonth);
  const dueDateThisMonth = new Date(year, month, clampedDay);

  const todayMidnight = new Date(year, month, now.getDate());
  const diffMs = dueDateThisMonth.getTime() - todayMidnight.getTime();
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (debt.paidMonths.includes(monthKey) || debt.principal <= 0) {
    return {
      status: 'paid',
      daysDiff,
      dueDateThisMonth,
      statusLabel: debt.principal <= 0 ? 'ปิดหนี้แล้ว' : 'ชำระงวดนี้แล้ว',
    };
  }

  if (daysDiff < 0) {
    return {
      status: 'overdue',
      daysDiff,
      dueDateThisMonth,
      statusLabel: `เลยกำหนด ${Math.abs(daysDiff)} วัน`,
    };
  }
  if (daysDiff === 0) {
    return {
      status: 'today',
      daysDiff: 0,
      dueDateThisMonth,
      statusLabel: 'ครบกำหนดวันนี้',
    };
  }
  if (daysDiff <= leadDays) {
    return {
      status: 'soon',
      daysDiff,
      dueDateThisMonth,
      statusLabel: `อีก ${daysDiff} วันครบกำหนด`,
    };
  }
  return {
    status: 'upcoming',
    daysDiff,
    dueDateThisMonth,
    statusLabel: `ครบกำหนดวันที่ ${clampedDay} (อีก ${daysDiff} วัน)`,
  };
}

/**
 * Core Debt Payoff Simulator
 * Supports Avalanche (highest interest rate first), Snowball (lowest balance first),
 * and Minimum-Only (baseline with no extra budget and no rollover).
 */
export function simulateDebtPayoff(
  debts: DebtItem[],
  extraMonthlyBudget: number,
  strategy: PayoffStrategy,
  baseDate = new Date()
): SimulationResult {
  const activeInitial = debts.filter((d) => d.principal > 0.01);
  const initialTotalDebt = activeInitial.reduce((s, d) => s + d.principal, 0);

  if (activeInitial.length === 0 || initialTotalDebt <= 0) {
    return {
      strategy,
      months: [],
      totalMonths: 0,
      debtFreeLabel: 'ปลอดหนี้แล้ว',
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      initialTotalDebt: 0,
      hasNegativeAmortization: false,
      stalledDebtNames: [],
      firstMonthPlan: [],
    };
  }

  const MAX_MONTHS = 360;
  const balances = new Map<string, number>();
  for (const d of activeInitial) {
    balances.set(d.id, d.principal);
  }

  const totalMinBudget = activeInitial.reduce(
    (s, d) => s + Math.max(0, d.minPayment),
    0
  );
  const extra = strategy === 'minimum' ? 0 : Math.max(0, extraMonthlyBudget);
  const fixedTotalBudget = totalMinBudget + extra;

  const months: SimulationMonth[] = [];
  let cumulativeInterest = 0;
  let totalAmountPaid = 0;
  const stalledSet = new Set<string>();

  for (let m = 1; m <= MAX_MONTHS; m++) {
    const stillActive = activeInitial.filter((d) => (balances.get(d.id) ?? 0) > 0.01);
    if (stillActive.length === 0) break;

    const { monthKey, fullLabel } = getThaiMonthLabel(m - 1, baseDate);
    const interestForDebt = new Map<string, number>();
    const minPaymentForDebt = new Map<string, number>();

    // 1. Accrue interest and calculate required minimum payment for active debts
    let requiredMinSum = 0;
    for (const d of stillActive) {
      const bal = balances.get(d.id) ?? 0;
      const monthlyRate = Math.max(0, d.annualRate) / 100 / 12;
      const accruedInterest = bal * monthlyRate;
      interestForDebt.set(d.id, accruedInterest);

      const owed = bal + accruedInterest;
      const effectiveMin = Math.min(owed, Math.max(0, d.minPayment));
      minPaymentForDebt.set(d.id, effectiveMin);
      requiredMinSum += effectiveMin;

      if (m === 1 && effectiveMin <= accruedInterest && strategy === 'minimum' && bal > 0) {
        stalledSet.add(d.name);
      }
    }

    // 2. Determine extra/rollover pool for this month
    let extraPool =
      strategy === 'minimum'
        ? 0
        : Math.max(0, fixedTotalBudget - requiredMinSum);

    // Sort priority for extra rollover
    const prioritized = [...stillActive].sort((a, b) => {
      const balA = balances.get(a.id) ?? 0;
      const balB = balances.get(b.id) ?? 0;
      if (strategy === 'avalanche') {
        if (Math.abs(b.annualRate - a.annualRate) > 0.001) {
          return b.annualRate - a.annualRate;
        }
        return balA - balB;
      }
      if (strategy === 'snowball') {
        if (Math.abs(balA - balB) > 1) {
          return balA - balB;
        }
        return b.annualRate - a.annualRate;
      }
      return 0;
    });

    const extraAllocated = new Map<string, number>();
    if (extraPool > 0.01) {
      for (const d of prioritized) {
        if (extraPool <= 0.01) break;
        const bal = balances.get(d.id) ?? 0;
        const intr = interestForDebt.get(d.id) ?? 0;
        const minP = minPaymentForDebt.get(d.id) ?? 0;
        const remainingRoom = Math.max(0, bal + intr - minP);
        const add = Math.min(extraPool, remainingRoom);
        if (add > 0) {
          extraAllocated.set(d.id, add);
          extraPool -= add;
        }
      }
    }

    // 3. Apply payments and record snapshot
    let monthPayment = 0;
    let monthPrincipal = 0;
    let monthInterest = 0;
    let monthRemaining = 0;
    const paidOffNames: string[] = [];
    const breakdown: MonthlyDebtSlice[] = [];

    for (const d of stillActive) {
      const bal = balances.get(d.id) ?? 0;
      const intr = interestForDebt.get(d.id) ?? 0;
      const pay = Math.min(
        bal + intr,
        (minPaymentForDebt.get(d.id) ?? 0) + (extraAllocated.get(d.id) ?? 0)
      );

      // Standard allocation: payment covers accrued interest first, remainder reduces principal
      const intrPaid = Math.min(pay, intr);
      const prinPaid = pay - intrPaid;
      const newBal = Math.max(0, bal + intr - pay);
      const isPaidOff = newBal <= 0.01;

      if (m === 1 && newBal >= bal && bal > 0) {
        if (pay <= intr && d.annualRate > 0) {
          stalledSet.add(d.name);
        }
      }

      balances.set(d.id, isPaidOff ? 0 : newBal);
      if (isPaidOff) {
        paidOffNames.push(d.name);
      }

      monthPayment += pay;
      monthInterest += intrPaid;
      monthPrincipal += prinPaid;
      monthRemaining += isPaidOff ? 0 : newBal;

      breakdown.push({
        debtId: d.id,
        debtName: d.name,
        payment: pay,
        principalPaid: prinPaid,
        interestPaid: intrPaid,
        endingBalance: isPaidOff ? 0 : newBal,
        paidOffThisMonth: isPaidOff,
      });
    }

    cumulativeInterest += monthInterest;
    totalAmountPaid += monthPayment;

    const activeAfter = activeInitial.filter((d) => (balances.get(d.id) ?? 0) > 0.01).length;

    months.push({
      monthIndex: m,
      monthKey,
      dateLabel: fullLabel,
      totalPayment: monthPayment,
      totalPrincipalPaid: monthPrincipal,
      totalInterestPaid: monthInterest,
      totalRemainingBalance: monthRemaining,
      cumulativeInterest,
      activeDebtCount: activeAfter,
      paidOffNames,
      breakdown,
    });

    if (monthRemaining <= 0.01) {
      break;
    }
  }

  const totalMonths = months.length;
  const lastMonth = months[months.length - 1];
  const remainingAtEnd = lastMonth ? lastMonth.totalRemainingBalance : 0;
  const debtFreeLabel =
    remainingAtEnd > 1
      ? 'ไม่สามารถปิดหมดใน 30 ปี (ยอดชำระต่ำกว่าดอกเบี้ย)'
      : lastMonth
        ? `${lastMonth.dateLabel} (${formatDurationThai(totalMonths)})`
        : 'ปลอดหนี้แล้ว';

  return {
    strategy,
    months,
    totalMonths,
    debtFreeLabel,
    totalInterestPaid: cumulativeInterest,
    totalAmountPaid,
    initialTotalDebt,
    hasNegativeAmortization: stalledSet.size > 0 || remainingAtEnd > 1,
    stalledDebtNames: Array.from(stalledSet),
    firstMonthPlan: months[0]?.breakdown ?? [],
  };
}

/**
 * Calculator 1: Bank Deposit (Savings / Fixed / Recurring DCA)
 */
export interface BankDepositInput {
  mode: 'savings' | 'fixed' | 'recurring';
  initialDeposit: number;
  monthlyDeposit: number;
  annualRate: number;
  months: number;
  applyTax15: boolean; // 15% withholding tax
}

export interface BankDepositScheduleRow {
  month: number;
  totalDeposited: number;
  interestEarned: number;
  balance: number;
}

export interface BankDepositResult {
  totalPrincipal: number;
  grossInterest: number;
  taxAmount: number;
  netInterest: number;
  finalBalance: number;
  effectiveYieldAnnual: number;
  schedule: BankDepositScheduleRow[];
}

export function calculateBankDeposit(input: BankDepositInput): BankDepositResult {
  const { mode, initialDeposit, monthlyDeposit, annualRate, months, applyTax15 } = input;
  const safeMonths = Math.max(1, Math.round(months));
  const rMonth = Math.max(0, annualRate) / 100 / 12;
  let balance = Math.max(0, initialDeposit);
  let totalPrincipal = balance;
  let grossInterest = 0;
  let uncompoundedInterest = 0;
  const schedule: BankDepositScheduleRow[] = [];

  for (let m = 1; m <= safeMonths; m++) {
    if (mode === 'recurring') {
      const add = Math.max(0, monthlyDeposit);
      balance += add;
      totalPrincipal += add;
    }

    const monthlyInt = balance * rMonth;
    grossInterest += monthlyInt;

    if (mode === 'savings') {
      // Thai savings accounts typically compound every 6 months (June/Dec)
      uncompoundedInterest += monthlyInt;
      if (m % 6 === 0 || m === safeMonths) {
        balance += uncompoundedInterest;
        uncompoundedInterest = 0;
      }
    } else if (mode === 'recurring') {
      balance += monthlyInt;
    } else {
      // Fixed deposit pays out / compounds at term maturity or monthly display
      uncompoundedInterest += monthlyInt;
      if (m === safeMonths) {
        balance += uncompoundedInterest;
        uncompoundedInterest = 0;
      }
    }

    schedule.push({
      month: m,
      totalDeposited: totalPrincipal,
      interestEarned: grossInterest,
      balance: balance + uncompoundedInterest,
    });
  }

  // Thai savings rule: 15% tax applies only if annual interest > 20,000 THB (when tax enabled),
  // whereas fixed deposits pay 15% tax on all interest (unless tax-free 24m recurring).
  let taxAmount = 0;
  if (applyTax15) {
    if (mode === 'savings') {
      const annualizedInt = (grossInterest / safeMonths) * 12;
      taxAmount = annualizedInt > 20_000 ? grossInterest * 0.15 : 0;
    } else {
      taxAmount = grossInterest * 0.15;
    }
  }

  const netInterest = Math.max(0, grossInterest - taxAmount);
  const finalBalance = totalPrincipal + netInterest;
  const years = Math.max(1 / 12, safeMonths / 12);
  const avgCapital =
    mode === 'recurring'
      ? initialDeposit + (monthlyDeposit * (safeMonths + 1)) / 2
      : initialDeposit;
  const effectiveYieldAnnual =
    avgCapital > 0 ? (netInterest / avgCapital / years) * 100 : 0;

  return {
    totalPrincipal,
    grossInterest,
    taxAmount,
    netInterest,
    finalBalance,
    effectiveYieldAnnual,
    schedule,
  };
}

/**
 * Calculator 2: Bank Loan (Effective Rate vs Flat Rate)
 */
export interface BankLoanInput {
  mode: 'reducing' | 'flat';
  principal: number;
  annualRate: number;
  months: number;
  extraMonthlyPayment: number;
}

export interface BankLoanRow {
  month: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
}

export interface BankLoanResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  effectiveAnnualRate: number;
  monthsWithExtra: number;
  interestWithExtra: number;
  monthsSaved: number;
  interestSaved: number;
  schedule: BankLoanRow[];
}

export function solveEffectiveAnnualRate(
  principal: number,
  monthlyPayment: number,
  months: number
): number {
  if (principal <= 0 || months <= 0 || monthlyPayment * months <= principal) return 0;
  let low = 0.000001;
  let high = 0.5; // up to 50% monthly (600% APR)
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const factor = Math.pow(1 + mid, months);
    const pmt = (principal * mid * factor) / (factor - 1);
    if (pmt > monthlyPayment) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return ((low + high) / 2) * 12 * 100;
}

export function calculateBankLoan(input: BankLoanInput): BankLoanResult {
  const P = Math.max(0, input.principal);
  const n = Math.max(1, Math.round(input.months));
  const rAnnual = Math.max(0, input.annualRate);
  const extra = Math.max(0, input.extraMonthlyPayment);

  if (P <= 0) {
    return {
      monthlyPayment: 0,
      totalInterest: 0,
      totalPayment: 0,
      effectiveAnnualRate: 0,
      monthsWithExtra: 0,
      interestWithExtra: 0,
      monthsSaved: 0,
      interestSaved: 0,
      schedule: [],
    };
  }

  if (input.mode === 'flat') {
    const years = n / 12;
    const totalInterest = P * (rAnnual / 100) * years;
    const totalPayment = P + totalInterest;
    const monthlyPayment = totalPayment / n;
    const eir = solveEffectiveAnnualRate(P, monthlyPayment, n);

    const schedule: BankLoanRow[] = [];
    let bal = P;
    const monthlyPrin = P / n;
    const monthlyInt = totalInterest / n;
    for (let m = 1; m <= n; m++) {
      bal = Math.max(0, bal - monthlyPrin);
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principalPaid: monthlyPrin,
        interestPaid: monthlyInt,
        endingBalance: bal,
      });
    }

    return {
      monthlyPayment,
      totalInterest,
      totalPayment,
      effectiveAnnualRate: eir,
      monthsWithExtra: n,
      interestWithExtra: totalInterest,
      monthsSaved: 0,
      interestSaved: 0,
      schedule,
    };
  }

  // Reducing balance (Effective Rate)
  const r = rAnnual / 100 / 12;
  const monthlyPayment =
    r === 0
      ? P / n
      : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const baseTotalPayment = monthlyPayment * n;
  const baseTotalInterest = Math.max(0, baseTotalPayment - P);

  const schedule: BankLoanRow[] = [];
  let bal = P;
  let interestWithExtra = 0;
  let m = 0;
  while (bal > 0.01 && m < 600) {
    m++;
    const intr = bal * r;
    const targetPay = monthlyPayment + extra;
    const actualPay = Math.min(bal + intr, targetPay);
    const prinPaid = actualPay - intr;
    bal = Math.max(0, bal - prinPaid);
    interestWithExtra += intr;
    schedule.push({
      month: m,
      payment: actualPay,
      principalPaid: prinPaid,
      interestPaid: intr,
      endingBalance: bal,
    });
  }

  return {
    monthlyPayment,
    totalInterest: baseTotalInterest,
    totalPayment: baseTotalPayment,
    effectiveAnnualRate: rAnnual,
    monthsWithExtra: m,
    interestWithExtra,
    monthsSaved: Math.max(0, n - m),
    interestSaved: Math.max(0, baseTotalInterest - interestWithExtra),
    schedule,
  };
}

/**
 * Calculator 3: Daily Loan Interest (ดอกเบี้ยเงินกู้รายวัน)
 */
export interface DailyLoanInput {
  mode: 'interest_only' | 'daily_installment';
  principal: number;
  dailyRatePercent: number; // used when mode === 'interest_only'
  days: number;
  dailyPaymentAmount: number; // used when mode === 'daily_installment'
}

export interface DailyLoanResult {
  dailyInterestCost: number;
  monthlyInterestCost: number;
  totalInterestPaid: number;
  totalRepayment: number;
  equivalentAnnualRate: number;
  equivalentMonthlyRate: number;
}

export function calculateDailyLoan(input: DailyLoanInput): DailyLoanResult {
  const P = Math.max(0, input.principal);
  const days = Math.max(1, Math.round(input.days));

  if (P <= 0) {
    return {
      dailyInterestCost: 0,
      monthlyInterestCost: 0,
      totalInterestPaid: 0,
      totalRepayment: 0,
      equivalentAnnualRate: 0,
      equivalentMonthlyRate: 0,
    };
  }

  if (input.mode === 'interest_only') {
    const dailyRate = Math.max(0, input.dailyRatePercent) / 100;
    const dailyInterestCost = P * dailyRate;
    const monthlyInterestCost = dailyInterestCost * 30;
    const totalInterestPaid = dailyInterestCost * days;
    const totalRepayment = P + totalInterestPaid;
    const equivalentAnnualRate = input.dailyRatePercent * 365;
    const equivalentMonthlyRate = input.dailyRatePercent * 30;

    return {
      dailyInterestCost,
      monthlyInterestCost,
      totalInterestPaid,
      totalRepayment,
      equivalentAnnualRate,
      equivalentMonthlyRate,
    };
  }

  // Daily installment mode (e.g., กู้ 10,000 ส่งวันละ 500 x 24 วัน = 12,000)
  const totalRepayment = Math.max(0, input.dailyPaymentAmount) * days;
  const totalInterestPaid = Math.max(0, totalRepayment - P);
  const dailyInterestCost = totalInterestPaid / days;
  const monthlyInterestCost = dailyInterestCost * 30;

  // Solve daily IRR for annuity of `days` periods
  let equivalentDailyRate = 0;
  if (totalRepayment > P && input.dailyPaymentAmount > 0) {
    let low = 0.000001;
    let high = 0.5;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const factor = Math.pow(1 + mid, days);
      const pmt = (P * mid * factor) / (factor - 1);
      if (pmt > input.dailyPaymentAmount) {
        high = mid;
      } else {
        low = mid;
      }
    }
    equivalentDailyRate = ((low + high) / 2) * 100;
  }

  return {
    dailyInterestCost,
    monthlyInterestCost,
    totalInterestPaid,
    totalRepayment,
    equivalentAnnualRate: equivalentDailyRate * 365,
    equivalentMonthlyRate: equivalentDailyRate * 30,
  };
}

/**
 * Calculator 4: Pawnshop Calculator (คำนวณการจำนำสิ่งของ)
 */
export interface PawnshopInput {
  mode: 'municipal_tiered' | 'custom_flat';
  principal: number;
  tier1Limit: number; // default 5,000 THB
  tier1RateMonthly: number; // default 0.25% or 0.50%
  tier2RateMonthly: number; // default 1.00% or 1.25%
  customRateMonthly: number;
  days: number;
  halfMonthRule: boolean; // <= 15 days = 0.5 month, > 15 days = 1 full month per cycle
  pawnDateStr: string;
}

export interface PawnshopResult {
  monthlyInterest: number;
  effectiveBillingMonths: number;
  totalInterest: number;
  redemptionTotal: number;
  effectiveAnnualRate: number;
  expiryDateLabel: string;
}

export function parseLocalISODate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

export function calculatePawnshop(input: PawnshopInput): PawnshopResult {
  const P = Math.max(0, input.principal);
  const days = Math.max(1, Math.round(input.days));

  let monthlyInterest = 0;
  if (input.mode === 'municipal_tiered') {
    const t1 = Math.min(P, Math.max(0, input.tier1Limit));
    const t2 = Math.max(0, P - t1);
    monthlyInterest =
      t1 * (Math.max(0, input.tier1RateMonthly) / 100) +
      t2 * (Math.max(0, input.tier2RateMonthly) / 100);
  } else {
    monthlyInterest = P * (Math.max(0, input.customRateMonthly) / 100);
  }

  let effectiveBillingMonths = days / 30;
  if (input.halfMonthRule) {
    const fullMonths = Math.floor(days / 30);
    const remDays = days % 30;
    const partial = remDays === 0 ? 0 : remDays <= 15 ? 0.5 : 1;
    effectiveBillingMonths = Math.max(0.5, fullMonths + partial);
  }

  const totalInterest = monthlyInterest * effectiveBillingMonths;
  const redemptionTotal = P + totalInterest;
  const effectiveAnnualRate = P > 0 ? ((monthlyInterest * 12) / P) * 100 : 0;

  // Thai pawn ticket expires in 4 months + 30 days (~150 days)
  const start = input.pawnDateStr ? parseLocalISODate(input.pawnDateStr) : new Date();
  const expiry = new Date(start.getFullYear(), start.getMonth() + 4, start.getDate() + 30);

  return {
    monthlyInterest,
    effectiveBillingMonths,
    totalInterest,
    redemptionTotal,
    effectiveAnnualRate,
    expiryDateLabel: Number.isNaN(expiry.getTime()) ? '-' : formatThaiDate(expiry),
  };
}

/**
 * Calculator 5: Mortgage / Asset Pledging (คำนวณการจำนองทรัพย์สิน)
 */
export interface MortgageInput {
  appraisedValue: number;
  loanAmount: number;
  annualRate: number;
  months: number;
  repaymentType: 'amortizing' | 'interest_only';
  includeRegistrationFee: boolean; // 1% mortgage registration + 0.05% stamp duty (max 10,000)
}

export interface MortgageResult {
  ltvPercent: number;
  monthlyPayment: number;
  totalInterest: number;
  registrationFee: number;
  stampDuty: number;
  totalUpfrontFees: number;
  netDisbursedAmount: number;
  totalRepayment: number;
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const P = Math.max(0, input.loanAmount);
  const appraised = Math.max(0, input.appraisedValue);
  const n = Math.max(1, Math.round(input.months));
  const rAnnual = Math.max(0, input.annualRate);
  const rMonth = rAnnual / 100 / 12;

  const ltvPercent = appraised > 0 ? (P / appraised) * 100 : 0;

  let monthlyPayment = 0;
  let totalInterest = 0;
  let totalRepayment = 0;

  if (input.repaymentType === 'interest_only') {
    monthlyPayment = P * rMonth;
    totalInterest = monthlyPayment * n;
    totalRepayment = P + totalInterest;
  } else {
    monthlyPayment =
      rMonth === 0
        ? P / n
        : (P * rMonth * Math.pow(1 + rMonth, n)) / (Math.pow(1 + rMonth, n) - 1);
    totalRepayment = monthlyPayment * n;
    totalInterest = Math.max(0, totalRepayment - P);
  }

  const registrationFee = input.includeRegistrationFee ? Math.min(200_000, P * 0.01) : 0;
  const stampDuty = input.includeRegistrationFee ? Math.min(10_000, P * 0.0005) : 0;
  const totalUpfrontFees = registrationFee + stampDuty;

  return {
    ltvPercent,
    monthlyPayment,
    totalInterest,
    registrationFee,
    stampDuty,
    totalUpfrontFees,
    netDisbursedAmount: Math.max(0, P - totalUpfrontFees),
    totalRepayment,
  };
}

/**
 * Calculator 6: Product Installment (ผ่อนสินค้า 0% 10 เดือน / มีดอกเบี้ย)
 */
export interface InstallmentInput {
  productPrice: number;
  downPayment: number;
  months: number;
  rateType: 'zero' | 'monthly_flat' | 'annual_flat';
  rateValue: number;
  cashDiscountPercent: number;
  cardCashbackPercent: number;
}

export interface InstallmentResult {
  financedPrincipal: number;
  monthlyInterest: number;
  totalInterest: number;
  totalInstallmentCost: number; // principal + interest (excluding down payment)
  grandTotalPaid: number; // down payment + principal + interest
  monthlyPayment: number;
  effectiveAnnualRate: number;
  cashPriceAfterDiscount: number;
  netInstallmentAfterCashback: number;
  differenceVsCash: number; // positive = installment is more expensive than cash
}

export function calculateInstallment(input: InstallmentInput): InstallmentResult {
  const price = Math.max(0, input.productPrice);
  const down = Math.min(price, Math.max(0, input.downPayment));
  const financedPrincipal = Math.max(0, price - down);
  const n = Math.max(1, Math.round(input.months));

  let monthlyRate = 0;
  if (input.rateType === 'monthly_flat') {
    monthlyRate = Math.max(0, input.rateValue) / 100;
  } else if (input.rateType === 'annual_flat') {
    monthlyRate = Math.max(0, input.rateValue) / 100 / 12;
  }

  const monthlyInterest = financedPrincipal * monthlyRate;
  const totalInterest = monthlyInterest * n;
  const totalInstallmentCost = financedPrincipal + totalInterest;
  const grandTotalPaid = down + totalInstallmentCost;
  const monthlyPayment = totalInstallmentCost / n;

  const effectiveAnnualRate =
    monthlyRate === 0
      ? 0
      : solveEffectiveAnnualRate(financedPrincipal, monthlyPayment, n);

  const cashDiscount = price * (Math.max(0, input.cashDiscountPercent) / 100);
  const cashPriceAfterDiscount = price - cashDiscount;
  const cashback = financedPrincipal * (Math.max(0, input.cardCashbackPercent) / 100);
  const netInstallmentAfterCashback = grandTotalPaid - cashback;
  const differenceVsCash = netInstallmentAfterCashback - cashPriceAfterDiscount;

  return {
    financedPrincipal,
    monthlyInterest,
    totalInterest,
    totalInstallmentCost,
    grandTotalPaid,
    monthlyPayment,
    effectiveAnnualRate,
    cashPriceAfterDiscount,
    netInstallmentAfterCashback,
    differenceVsCash,
  };
}

/**
 * Calculator 7: Credit Card Swiping (จ่ายเต็มจำนวน vs จ่ายขั้นต่ำ vs จ่ายคงที่)
 */
export interface CreditCardInput {
  newSwipeAmount: number;
  previousBalance: number;
  annualRate: number; // Thai BOT cap: 16% / year
  minRatePercent: number; // e.g. 8% (current BOT rule), 5%, or 10%
  minFloorAmount: number; // e.g. 500 or 1,000 THB
  daysFromSwipeToDue: number; // Days from posting date to due date (e.g. 30-45 days)
  customMonthlyPayment: number;
}

export interface CreditCardMonthRow {
  month: number;
  startingBalance: number;
  payment: number;
  interestPaid: number;
  principalPaid: number;
  endingBalance: number;
}

export interface CreditCardPlanSummary {
  firstMonthPayment: number;
  months: number;
  totalInterest: number;
  totalPaid: number;
  stalled: boolean;
  schedule: CreditCardMonthRow[];
}

export interface CreditCardResult {
  statementTotal: number;
  firstCycleRetroInterest: number;
  fullPayment: {
    paymentRequired: number;
    interestCharged: number;
    totalPaid: number;
    interestFreeSaved: number;
  };
  minimumPlan: CreditCardPlanSummary;
  fixedPlan: CreditCardPlanSummary;
  monthsSavedWithFixed: number;
  interestSavedWithFixed: number;
}

export function calculateCreditCard(input: CreditCardInput): CreditCardResult {
  const newSwipe = Math.max(0, input.newSwipeAmount);
  const prevBal = Math.max(0, input.previousBalance);
  const statementTotal = newSwipe + prevBal;
  const rAnnual = Math.max(0, input.annualRate);
  const rDaily = rAnnual / 100 / 365;
  const rMonth = rAnnual / 100 / 12;
  const days = Math.max(0, Math.round(input.daysFromSwipeToDue));
  const minPct = Math.max(0.1, input.minRatePercent) / 100;
  const minFloor = Math.max(0, input.minFloorAmount);

  // Retroactive interest from swipe posting date to due date if NOT paid in full
  const retroSwipeInterest = newSwipe * rDaily * days;
  const prevCycleInterest = prevBal * rMonth;
  const firstCycleRetroInterest = retroSwipeInterest + prevCycleInterest;

  // Full payment: if no previous carried balance, 0 interest on new swipe!
  const fullInterest = prevBal > 0 ? prevCycleInterest : 0;
  const fullPaymentRequired = statementTotal + fullInterest;

  const simulatePlan = (
    mode: 'minimum' | 'fixed',
    fixedAmount: number
  ): CreditCardPlanSummary => {
    if (statementTotal <= 0) {
      return {
        firstMonthPayment: 0,
        months: 0,
        totalInterest: 0,
        totalPaid: 0,
        stalled: false,
        schedule: [],
      };
    }

    const schedule: CreditCardMonthRow[] = [];
    let balance = statementTotal;
    let totalInterest = 0;
    let totalPaid = 0;
    let firstMonthPayment = 0;
    let stalled = false;

    const MAX_MONTHS = 360;
    for (let m = 1; m <= MAX_MONTHS; m++) {
      if (balance <= 0.01) break;

      const startBal = balance;
      let interestThisMonth = m === 1 ? firstCycleRetroInterest : balance * rMonth;

      // Determine payment for this month
      const targetPay =
        mode === 'minimum'
          ? Math.max(minFloor, balance * minPct)
          : Math.max(0, fixedAmount);

      // If fixed payment pays off entire statement in month 1 and no prev balance, interest = 0
      if (m === 1 && mode === 'fixed' && targetPay >= statementTotal && prevBal === 0) {
        interestThisMonth = 0;
      }

      const owed = balance + interestThisMonth;
      const actualPay = Math.min(owed, targetPay);

      if (m === 1) {
        firstMonthPayment = actualPay;
      }

      if (actualPay <= interestThisMonth && interestThisMonth > 0 && balance > 1) {
        stalled = true;
      }

      const intrPaid = Math.min(actualPay, interestThisMonth);
      const prinPaid = actualPay - intrPaid;
      balance = Math.max(0, owed - actualPay);

      totalInterest += intrPaid;
      totalPaid += actualPay;

      schedule.push({
        month: m,
        startingBalance: startBal,
        payment: actualPay,
        interestPaid: intrPaid,
        principalPaid: prinPaid,
        endingBalance: balance <= 0.01 ? 0 : balance,
      });

      if (balance <= 0.01) break;
      if (m >= 12 && stalled && actualPay <= interestThisMonth) {
        // Prevent meaningless 360-row loop when fixed payment < monthly interest
        if (mode === 'fixed' && fixedAmount <= interestThisMonth) {
          break;
        }
      }
    }

    return {
      firstMonthPayment,
      months: stalled && balance > 1 ? 360 : schedule.length,
      totalInterest,
      totalPaid,
      stalled: stalled && balance > 1,
      schedule,
    };
  };

  const minimumPlan = simulatePlan('minimum', 0);
  const fixedPlan = simulatePlan('fixed', input.customMonthlyPayment);

  const monthsSavedWithFixed =
    minimumPlan.stalled || fixedPlan.stalled
      ? 0
      : Math.max(0, minimumPlan.months - fixedPlan.months);
  const interestSavedWithFixed = Math.max(
    0,
    minimumPlan.totalInterest - fixedPlan.totalInterest
  );

  return {
    statementTotal,
    firstCycleRetroInterest,
    fullPayment: {
      paymentRequired: fullPaymentRequired,
      interestCharged: fullInterest,
      totalPaid: fullPaymentRequired,
      interestFreeSaved: retroSwipeInterest,
    },
    minimumPlan,
    fixedPlan,
    monthsSavedWithFixed,
    interestSavedWithFixed,
  };
}

