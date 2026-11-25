import { DebtItem, ExpenseItem, IncomeItem, ReminderSettings } from '../types/finance';

export function createSampleData(): {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  debts: DebtItem[];
  extraBudget: number;
  reminderSettings: ReminderSettings;
} {
  const today = new Date();
  const currentDay = today.getDate();

  const wrapDay = (offset: number) => {
    const d = currentDay + offset;
    if (d < 1) return Math.max(1, 28 + d);
    if (d > 28) return Math.min(28, d - 28);
    return d;
  };

  return {
    incomes: [
      {
        id: 'inc-1',
        name: 'เงินเดือนประจำ (สุทธิหลังหักประกันสังคม)',
        category: 'salary',
        amount: 36500,
        frequency: 'monthly',
        payDay: 25,
        notes: 'โอนเข้าบัญชีวันที่ 25 ของทุกเดือน',
      },
      {
        id: 'inc-2',
        name: 'รับงานออกแบบ / ฟรีแลนซ์เสาร์-อาทิตย์',
        category: 'freelance',
        amount: 8500,
        frequency: 'monthly',
        payDay: 15,
        notes: 'รายได้เสริมเฉลี่ยต่อเดือน',
      },
      {
        id: 'inc-3',
        name: 'เงินปันผลสหกรณ์และดอกเบี้ยเงินฝาก',
        category: 'investment',
        amount: 12000,
        frequency: 'yearly',
        notes: 'เฉลี่ย 1,000 บาท/เดือน',
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        name: 'ค่าเช่าห้อง / คอนโด',
        category: 'housing',
        amount: 7500,
      },
      {
        id: 'exp-2',
        name: 'ค่าอาหารและของใช้ประจำวัน',
        category: 'food',
        amount: 8000,
      },
      {
        id: 'exp-3',
        name: 'ค่าเดินทาง / น้ำมัน / BTS',
        category: 'transport',
        amount: 3200,
      },
      {
        id: 'exp-4',
        name: 'ค่าน้ำ ค่าไฟ และอินเทอร์เน็ต',
        category: 'utilities',
        amount: 2100,
      },
    ],
    debts: [
      {
        id: 'debt-1',
        name: 'หนี้เงินกู้นอกระบบ / ดอกรายวัน',
        category: 'daily_loan',
        principal: 18000,
        rateInput: 3,
        ratePeriod: 'month',
        annualRate: 36,
        interestType: 'reducing',
        minPayment: 2000,
        dueDay: wrapDay(2),
        paidMonths: [],
        notes: 'ดอกเบี้ยสูงมาก ควรปิดเป็นก้อนแรก',
      },
      {
        id: 'debt-2',
        name: 'บัตรเครดิต KTC (ยอดหมุนเวียน)',
        category: 'credit_card',
        principal: 42000,
        rateInput: 16,
        ratePeriod: 'year',
        annualRate: 16,
        interestType: 'reducing',
        minPayment: 3360,
        dueDay: wrapDay(0),
        paidMonths: [],
        notes: 'เพดานดอกเบี้ยบัตรเครดิต 16%/ปี',
      },
      {
        id: 'debt-3',
        name: 'สินเชื่อส่วนบุคคล (Cash Loan)',
        category: 'personal_loan',
        principal: 85000,
        rateInput: 22,
        ratePeriod: 'year',
        annualRate: 22,
        interestType: 'reducing',
        minPayment: 4200,
        dueDay: wrapDay(5),
        paidMonths: [],
        notes: 'ลดต้นลดดอก 22% ต่อปี',
      },
      {
        id: 'debt-4',
        name: 'ผ่อนสมาร์ทโฟน 0% 10 เดือน',
        category: 'installment',
        principal: 21000,
        rateInput: 0,
        ratePeriod: 'year',
        annualRate: 0,
        interestType: 'flat',
        minPayment: 3500,
        dueDay: wrapDay(-1),
        remainingMonths: 6,
        paidMonths: [],
        notes: 'เหลืออีก 6 งวดสุดท้าย',
      },
      {
        id: 'debt-5',
        name: 'สินเชื่อรถจักรยานยนต์',
        category: 'auto_loan',
        principal: 46000,
        rateInput: 9.5,
        ratePeriod: 'year',
        annualRate: 9.5,
        interestType: 'reducing',
        minPayment: 2850,
        dueDay: wrapDay(10),
        paidMonths: [],
      },
    ],
    extraBudget: 6500,
    reminderSettings: {
      leadDays: 5,
      browserNotificationsEnabled: false,
    },
  };
}
