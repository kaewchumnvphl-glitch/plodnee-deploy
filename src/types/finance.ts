export type IncomeCategory =
  | 'salary'
  | 'freelance'
  | 'business'
  | 'commission'
  | 'investment'
  | 'other';

export type PaymentFrequency = 'monthly' | 'weekly' | 'yearly';

export interface IncomeItem {
  id: string;
  name: string;
  category: IncomeCategory;
  amount: number;
  frequency: PaymentFrequency;
  payDay?: number;
  notes?: string;
}

export type ExpenseCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'insurance'
  | 'family'
  | 'other';

export interface ExpenseItem {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  notes?: string;
}

export type DebtCategory =
  | 'credit_card'
  | 'personal_loan'
  | 'mortgage'
  | 'auto_loan'
  | 'daily_loan'
  | 'pawnshop'
  | 'installment'
  | 'student_loan'
  | 'other';

export type RatePeriod = 'year' | 'month' | 'day';
export type InterestType = 'reducing' | 'flat' | 'interest_only';

export interface DebtItem {
  id: string;
  name: string;
  category: DebtCategory;
  principal: number;
  rateInput: number;
  ratePeriod: RatePeriod;
  annualRate: number; // Normalized % per year
  interestType: InterestType;
  minPayment: number;
  dueDay: number; // 1 - 31
  remainingMonths?: number;
  paidMonths: string[]; // 'YYYY-MM'
  notes?: string;
}

export type PayoffStrategy = 'avalanche' | 'snowball' | 'minimum';

export interface MonthlyDebtSlice {
  debtId: string;
  debtName: string;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
  paidOffThisMonth: boolean;
}

export interface SimulationMonth {
  monthIndex: number;
  monthKey: string;
  dateLabel: string;
  totalPayment: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalRemainingBalance: number;
  cumulativeInterest: number;
  activeDebtCount: number;
  paidOffNames: string[];
  breakdown: MonthlyDebtSlice[];
}

export interface SimulationResult {
  strategy: PayoffStrategy;
  months: SimulationMonth[];
  totalMonths: number;
  debtFreeLabel: string;
  totalInterestPaid: number;
  totalAmountPaid: number;
  initialTotalDebt: number;
  hasNegativeAmortization: boolean;
  stalledDebtNames: string[];
  firstMonthPlan: MonthlyDebtSlice[];
}

export interface ReminderSettings {
  leadDays: number; // e.g. 3, 5, 7
  browserNotificationsEnabled: boolean;
}

export type MainTab =
  | 'overview'
  | 'cashflow'
  | 'debts'
  | 'analytics'
  | 'calculators';

export type CalculatorSubTab =
  | 'credit_card'
  | 'deposit'
  | 'loan'
  | 'daily'
  | 'pawn'
  | 'mortgage'
  | 'installment';

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salary: 'เงินเดือนประจำ',
  freelance: 'ฟรีแลนซ์ / งานเสริม',
  business: 'ธุรกิจ / ค้าขาย',
  commission: 'ค่าคอมมิชชั่น / โบนัส',
  investment: 'ปันผล / ดอกเบี้ย / ค่าเช่า',
  other: 'รายได้อื่นๆ',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'ที่อยู่อาศัย / ค่าเช่า',
  food: 'อาหารและของใช้จำเป็น',
  transport: 'เดินทาง / น้ำมัน',
  utilities: 'ค่าน้ำ-ไฟ-อินเทอร์เน็ต',
  insurance: 'ประกัน / สุขภาพ',
  family: 'ครอบครัว / การศึกษา',
  other: 'ค่าใช้จ่ายจำเป็นอื่นๆ',
};

export const DEBT_CATEGORY_LABELS: Record<DebtCategory, string> = {
  credit_card: 'บัตรเครดิต / บัตรกดเงินสด',
  personal_loan: 'สินเชื่อส่วนบุคคล',
  mortgage: 'สินเชื่อบ้าน / จำนองทรัพย์สิน',
  auto_loan: 'สินเชื่อรถยนต์ / มอเตอร์ไซค์',
  daily_loan: 'เงินกู้รายวัน / นอกระบบ',
  pawnshop: 'โรงรับจำนำ',
  installment: 'ผ่อนสินค้า (0% / มีดอกเบี้ย)',
  student_loan: 'กยศ. / สินเชื่อเพื่อการศึกษา',
  other: 'หนี้สินอื่นๆ',
};

export const INTEREST_TYPE_LABELS: Record<InterestType, string> = {
  reducing: 'ลดต้นลดดอก (Effective)',
  flat: 'ดอกเบี้ยคงที่ (Flat Rate)',
  interest_only: 'จ่ายเฉพาะดอกเบี้ย (ดอกลอย)',
};

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'รายเดือน',
  weekly: 'รายสัปดาห์',
  yearly: 'รายปี',
};
