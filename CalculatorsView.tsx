import React, { useMemo, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { CalculatorSubTab, DebtItem } from '../types/finance';
import {
  calculateBankDeposit,
  calculateBankLoan,
  calculateCreditCard,
  calculateDailyLoan,
  calculateInstallment,
  calculateMortgage,
  calculatePawnshop,
  formatDurationThai,
  formatTHB,
  parseLocalISODate,
} from '../utils/financeMath';

interface CalculatorsViewProps {
  onAddCalculatedDebt: (
    draft: Omit<DebtItem, 'id' | 'paidMonths'>
  ) => void;
}

const SUB_TABS: { id: CalculatorSubTab; label: string }[] = [
  { id: 'credit_card', label: 'รูดบัตรเครดิต (ขั้นต่ำ / เต็ม)' },
  { id: 'deposit', label: 'ดอกเบี้ยเงินฝาก' },
  { id: 'loan', label: 'เงินกู้ธนาคาร' },
  { id: 'daily', label: 'กู้รายวัน / นอกระบบ' },
  { id: 'pawn', label: 'จำนำสิ่งของ' },
  { id: 'mortgage', label: 'จำนองทรัพย์สิน' },
  { id: 'installment', label: 'ผ่อนสินค้า (0% / มีดอก)' },
];

export const CalculatorsView: React.FC<CalculatorsViewProps> = ({
  onAddCalculatedDebt,
}) => {
  const [subTab, setSubTab] = useState<CalculatorSubTab>('credit_card');

  // 0. Credit Card Swiping State
  const [ccCardName, setCcCardName] = useState('บัตรเครดิตหลัก');
  const [ccNewSwipe, setCcNewSwipe] = useState(25000);
  const [ccPrevBal, setCcPrevBal] = useState(0);
  const [ccRate, setCcRate] = useState(16);
  const [ccMinPct, setCcMinPct] = useState(8);
  const [ccMinFloor, setCcMinFloor] = useState(500);
  const [ccDaysToDue, setCcDaysToDue] = useState(40);
  const [ccCustomPay, setCcCustomPay] = useState(4000);
  const [ccScheduleMode, setCcScheduleMode] = useState<'minimum' | 'fixed'>('minimum');

  const ccResult = useMemo(
    () =>
      calculateCreditCard({
        newSwipeAmount: ccNewSwipe,
        previousBalance: ccPrevBal,
        annualRate: ccRate,
        minRatePercent: ccMinPct,
        minFloorAmount: ccMinFloor,
        daysFromSwipeToDue: ccDaysToDue,
        customMonthlyPayment: ccCustomPay,
      }),
    [
      ccNewSwipe,
      ccPrevBal,
      ccRate,
      ccMinPct,
      ccMinFloor,
      ccDaysToDue,
      ccCustomPay,
    ]
  );

  // 1. Bank Deposit State
  const [depMode, setDepMode] = useState<'savings' | 'fixed' | 'recurring'>('recurring');
  const [depInitial, setDepInitial] = useState(50000);
  const [depMonthly, setDepMonthly] = useState(5000);
  const [depRate, setDepRate] = useState(2.25);
  const [depMonths, setDepMonths] = useState(24);
  const [depTax15, setDepTax15] = useState(true);

  const depResult = useMemo(
    () =>
      calculateBankDeposit({
        mode: depMode,
        initialDeposit: depInitial,
        monthlyDeposit: depMonthly,
        annualRate: depRate,
        months: depMonths,
        applyTax15: depTax15,
      }),
    [depMode, depInitial, depMonthly, depRate, depMonths, depTax15]
  );

  // 2. Bank Loan State
  const [loanMode, setLoanMode] = useState<'reducing' | 'flat'>('reducing');
  const [loanPrincipal, setLoanPrincipal] = useState(1500000);
  const [loanRate, setLoanRate] = useState(5.25);
  const [loanMonths, setLoanMonths] = useState(240);
  const [loanExtra, setLoanExtra] = useState(3000);

  const loanResult = useMemo(
    () =>
      calculateBankLoan({
        mode: loanMode,
        principal: loanPrincipal,
        annualRate: loanRate,
        months: loanMonths,
        extraMonthlyPayment: loanMode === 'reducing' ? loanExtra : 0,
      }),
    [loanMode, loanPrincipal, loanRate, loanMonths, loanExtra]
  );

  // 3. Daily Loan State
  const [dailyMode, setDailyMode] = useState<'interest_only' | 'daily_installment'>(
    'daily_installment'
  );
  const [dailyPrincipal, setDailyPrincipal] = useState(10000);
  const [dailyRatePct, setDailyRatePct] = useState(2);
  const [dailyDays, setDailyDays] = useState(24);
  const [dailyPaymentAmt, setDailyPaymentAmt] = useState(500);

  const dailyResult = useMemo(
    () =>
      calculateDailyLoan({
        mode: dailyMode,
        principal: dailyPrincipal,
        dailyRatePercent: dailyRatePct,
        days: dailyDays,
        dailyPaymentAmount: dailyPaymentAmt,
      }),
    [dailyMode, dailyPrincipal, dailyRatePct, dailyDays, dailyPaymentAmt]
  );

  // 4. Pawnshop State
  const [pawnMode, setPawnMode] = useState<'municipal_tiered' | 'custom_flat'>(
    'municipal_tiered'
  );
  const [pawnItemName, setPawnItemName] = useState('ทองรูปพรรณ 1 บาท');
  const [pawnPrincipal, setPawnPrincipal] = useState(30000);
  const [pawnTier1Limit, setPawnTier1Limit] = useState(5000);
  const [pawnTier1Rate, setPawnTier1Rate] = useState(0.25);
  const [pawnTier2Rate, setPawnTier2Rate] = useState(1.0);
  const [pawnCustomRate, setPawnCustomRate] = useState(1.25);
  const [pawnDays, setPawnDays] = useState(90);
  const [pawnHalfRule, setPawnHalfRule] = useState(true);
  const [pawnDateStr, setPawnDateStr] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const pawnResult = useMemo(
    () =>
      calculatePawnshop({
        mode: pawnMode,
        principal: pawnPrincipal,
        tier1Limit: pawnTier1Limit,
        tier1RateMonthly: pawnTier1Rate,
        tier2RateMonthly: pawnTier2Rate,
        customRateMonthly: pawnCustomRate,
        days: pawnDays,
        halfMonthRule: pawnHalfRule,
        pawnDateStr,
      }),
    [
      pawnMode,
      pawnPrincipal,
      pawnTier1Limit,
      pawnTier1Rate,
      pawnTier2Rate,
      pawnCustomRate,
      pawnDays,
      pawnHalfRule,
      pawnDateStr,
    ]
  );

  // 5. Mortgage State
  const [mortAssetName, setMortAssetName] = useState('จำนองโฉนดที่ดิน / บ้านพักอาศัย');
  const [mortAppraised, setMortAppraised] = useState(2500000);
  const [mortLoan, setMortLoan] = useState(1500000);
  const [mortRate, setMortRate] = useState(6.5);
  const [mortMonths, setMortMonths] = useState(180);
  const [mortType, setMortType] = useState<'amortizing' | 'interest_only'>('amortizing');
  const [mortFees, setMortFees] = useState(true);

  const mortResult = useMemo(
    () =>
      calculateMortgage({
        appraisedValue: mortAppraised,
        loanAmount: mortLoan,
        annualRate: mortRate,
        months: mortMonths,
        repaymentType: mortType,
        includeRegistrationFee: mortFees,
      }),
    [mortAppraised, mortLoan, mortRate, mortMonths, mortType, mortFees]
  );

  // 6. Product Installment State
  const [instName, setInstName] = useState('เครื่องใช้ไฟฟ้า / สมาร์ทโฟน');
  const [instPrice, setInstPrice] = useState(32900);
  const [instDown, setInstDown] = useState(0);
  const [instMonths, setInstMonths] = useState(10);
  const [instRateType, setInstRateType] = useState<
    'zero' | 'monthly_flat' | 'annual_flat'
  >('zero');
  const [instRateVal, setInstRateVal] = useState(0.74);
  const [instCashDiscount, setInstCashDiscount] = useState(3);
  const [instCashback, setInstCashback] = useState(0);

  const instResult = useMemo(
    () =>
      calculateInstallment({
        productPrice: instPrice,
        downPayment: instDown,
        months: instMonths,
        rateType: instRateType,
        rateValue: instRateType === 'zero' ? 0 : instRateVal,
        cashDiscountPercent: instCashDiscount,
        cardCashbackPercent: instCashback,
      }),
    [
      instPrice,
      instDown,
      instMonths,
      instRateType,
      instRateVal,
      instCashDiscount,
      instCashback,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Calculator Navigation Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                subTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 0. CREDIT CARD SWIPING (FULL VS MINIMUM VS FIXED) */}
      {subTab === 'credit_card' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                คำนวณรูดบัตรเครดิต: จ่ายเต็มจำนวน vs จ่ายขั้นต่ำ
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                เปรียบเทียบผลต่างดอกเบี้ยย้อนหลังตั้งแต่วันรูดบัตรเมื่อจ่ายไม่เต็มจำนวน
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  ชื่อบัตรเครดิต
                </label>
                <input
                  type="text"
                  value={ccCardName}
                  onChange={(e) => setCcCardName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ยอดรูดใช้จ่ายรอบนี้ (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={ccNewSwipe}
                    onChange={(e) => setCcNewSwipe(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ยอดค้างเก่าจากบิลก่อน (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={ccPrevBal}
                    onChange={(e) => setCcPrevBal(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ดอกเบี้ยบัตร (% ต่อปี)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={ccRate}
                    onChange={(e) => setCcRate(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    วันตั้งแต่วันรูดถึงวันครบกำหนด
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={ccDaysToDue}
                    onChange={(e) =>
                      setCcDaysToDue(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    อัตราจ่ายขั้นต่ำ (% ยอดบิล)
                  </label>
                  <div className="mt-1 flex gap-1">
                    {[5, 8, 10].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCcMinPct(pct)}
                        className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors ${
                          ccMinPct === pct
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ขั้นต่ำสุดต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={ccMinFloor}
                    onChange={(e) => setCcMinFloor(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  เปรียบเทียบกรณีจ่ายคงที่ต่อเดือน (บาท/เดือน)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={ccCustomPay}
                  onChange={(e) => setCcCustomPay(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  onAddCalculatedDebt({
                    name: ccCardName || 'บัตรเครดิต',
                    category: 'credit_card',
                    principal: ccResult.statementTotal,
                    rateInput: ccRate,
                    ratePeriod: 'year',
                    annualRate: ccRate,
                    interestType: 'reducing',
                    minPayment: Math.ceil(ccResult.minimumPlan.firstMonthPayment),
                    dueDay: 25,
                    notes: `ขั้นต่ำ ${ccMinPct}% (อย่างน้อย ${formatTHB(ccMinFloor)})`,
                  })
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                เพิ่มยอดบัตรเครดิตนี้เข้าแผนปลดหนี้
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-5">
            {/* 3-Column Comparison: Full vs Minimum vs Fixed */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-xs font-semibold text-emerald-800">
                  1. จ่ายเต็มจำนวน 100%
                </p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-slate-900 tabular-nums">
                  {formatTHB(ccResult.fullPayment.paymentRequired)}
                </p>
                <p className="mt-1 text-xs text-emerald-700 tabular-nums">
                  ดอกเบี้ย: {formatTHB(ccResult.fullPayment.interestCharged, 2)} ·
                  จบใน 1 งวด
                </p>
              </div>

              <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
                <p className="text-xs font-semibold text-rose-800">
                  2. จ่ายขั้นต่ำ ({ccMinPct}%)
                </p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-slate-900 tabular-nums">
                  {formatTHB(ccResult.minimumPlan.firstMonthPayment)}
                  <span className="text-xs font-normal text-slate-500"> /งวดแรก</span>
                </p>
                <p className="mt-1 text-xs text-rose-700 tabular-nums">
                  ใช้เวลา {formatDurationThai(ccResult.minimumPlan.months)} · ดอกเบี้ยรวม{' '}
                  {formatTHB(ccResult.minimumPlan.totalInterest)}
                </p>
              </div>

              <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4">
                <p className="text-xs font-semibold text-teal-800">
                  3. จ่ายคงที่ {formatTHB(ccCustomPay)}/ด.
                </p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-teal-800 tabular-nums">
                  {ccResult.fixedPlan.stalled
                    ? 'ไม่พอตัดต้น'
                    : formatDurationThai(ccResult.fixedPlan.months)}
                </p>
                <p className="mt-1 text-xs text-teal-700 tabular-nums">
                  ดอกเบี้ยรวม {formatTHB(ccResult.fixedPlan.totalInterest)}
                  {ccResult.interestSavedWithFixed > 0
                    ? ` (ประหยัด ${formatTHB(ccResult.interestSavedWithFixed)})`
                    : ''}
                </p>
              </div>
            </div>

            {/* Retroactive Interest Explanation */}
            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>ยอดรวมใบแจ้งหนี้รอบนี้ (ยอดค้างเก่า + ยอดรูดใหม่)</span>
                <span className="font-mono-num font-semibold text-slate-900 tabular-nums">
                  {formatTHB(ccResult.statementTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>
                  ดอกเบี้ยย้อนหลังงวดแรกทันทีที่จ่ายไม่เต็มจำนวน ({ccDaysToDue} วัน)
                </span>
                <span className="font-mono-num font-semibold text-rose-600 tabular-nums">
                  +{formatTHB(ccResult.firstCycleRetroInterest, 2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ดอกเบี้ยที่ประหยัดได้ทันทีหากจ่ายเต็มจำนวนรอบนี้</span>
                <span className="font-mono-num font-semibold text-emerald-700 tabular-nums">
                  {formatTHB(ccResult.fullPayment.interestFreeSaved, 2)}
                </span>
              </div>
            </div>

            {/* Schedule Toggle & Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  ตารางจำลองยอดบัตรเครดิตรายเดือน
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setCcScheduleMode('minimum')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      ccScheduleMode === 'minimum'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    แผนจ่ายขั้นต่ำ
                  </button>
                  <button
                    type="button"
                    onClick={() => setCcScheduleMode('fixed')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      ccScheduleMode === 'fixed'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    แผนจ่ายคงที่
                  </button>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2">งวด</th>
                      <th className="px-4 py-2 text-right">จ่าย/เดือน</th>
                      <th className="px-4 py-2 text-right">ตัดเงินต้น</th>
                      <th className="px-4 py-2 text-right">ดอกเบี้ย</th>
                      <th className="px-4 py-2 text-right">ยอดคงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(ccScheduleMode === 'minimum'
                      ? ccResult.minimumPlan.schedule
                      : ccResult.fixedPlan.schedule
                    )
                      .slice(0, 60)
                      .map((row) => (
                        <tr key={row.month}>
                          <td className="px-4 py-2 font-mono-num text-slate-500">
                            {row.month}
                          </td>
                          <td className="px-4 py-2 text-right font-mono-num font-medium tabular-nums">
                            {formatTHB(row.payment)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono-num text-teal-700 tabular-nums">
                            {formatTHB(row.principalPaid)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono-num text-rose-600 tabular-nums">
                            {formatTHB(row.interestPaid, 2)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono-num font-medium tabular-nums">
                            {formatTHB(row.endingBalance)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. BANK DEPOSIT CALCULATOR */}
      {subTab === 'deposit' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                คำนวณดอกเบี้ยเงินฝากธนาคาร
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                รองรับออมทรัพย์ ฝากประจำ และฝากทบต้นรายเดือน พร้อมคำนวณภาษี 15%
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'savings', label: 'ออมทรัพย์' },
                  { id: 'fixed', label: 'ฝากประจำ' },
                  { id: 'recurring', label: 'ฝากทุกเดือน' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDepMode(m.id)}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    depMode === m.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  เงินฝากเริ่มต้น (บาท)
                </label>
                <input
                  type="number"
                  min={0}
                  value={depInitial}
                  onChange={(e) => setDepInitial(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                />
              </div>

              {depMode === 'recurring' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ฝากเพิ่มทุกเดือน (บาท/เดือน)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={depMonthly}
                    onChange={(e) => setDepMonthly(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    อัตราดอกเบี้ย (% ต่อปี)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={depRate}
                    onChange={(e) => setDepRate(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ระยะเวลาฝาก (เดือน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={depMonths}
                    onChange={(e) =>
                      setDepMonths(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={depTax15}
                  onChange={(e) => setDepTax15(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                />
                หักภาษีดอกเบี้ย ณ ที่จ่าย 15% (ตามเกณฑ์สรรพากร)
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ยอดเงินรวมสุทธิปลายงวด</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-teal-700 tabular-nums">
                  {formatTHB(depResult.finalBalance, 2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ดอกเบี้ยสุทธิหลังหักภาษี</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-emerald-700 tabular-nums">
                  +{formatTHB(depResult.netInterest, 2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">เงินต้นฝากสะสม</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-slate-900 tabular-nums">
                  {formatTHB(depResult.totalPrincipal)}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>ดอกเบี้ยรวมก่อนหักภาษี</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(depResult.grossInterest, 2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ภาษีหัก ณ ที่จ่าย (15%)</span>
                <span className="font-mono-num font-medium text-rose-600 tabular-nums">
                  -{formatTHB(depResult.taxAmount, 2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ผลตอบแทนสุทธิเฉลี่ยต่อปี (Effective Yield)</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {depResult.effectiveYieldAnnual.toFixed(2)}% ต่อปี
                </span>
              </div>
            </div>

            {/* Growth bar visualization */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-slate-700">
                สัดส่วนเงินต้นเทียบกับดอกเบี้ยสุทธิที่ได้รับ
              </p>
              <div className="flex h-4 w-full overflow-hidden rounded-md bg-slate-100">
                <div
                  className="bg-slate-700"
                  style={{
                    width: `${
                      depResult.finalBalance > 0
                        ? (depResult.totalPrincipal / depResult.finalBalance) * 100
                        : 100
                    }%`,
                  }}
                />
                <div
                  className="bg-emerald-500"
                  style={{
                    width: `${
                      depResult.finalBalance > 0
                        ? (depResult.netInterest / depResult.finalBalance) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span>สีเข้ม: เงินต้นของคุณ</span>
                <span>สีเขียว: ดอกเบี้ยสุทธิทบต้น</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BANK LOAN CALCULATOR */}
      {subTab === 'loan' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                คำนวณดอกเบี้ยเงินกู้ธนาคาร (ลดต้นลดดอก / คงที่)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                รองรับสินเชื่อบ้าน สินเชื่อส่วนบุคคล และสินเชื่อรถยนต์แบบ Flat Rate
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setLoanMode('reducing')}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                  loanMode === 'reducing'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                ลดต้นลดดอก (บ้าน/ส่วนบุคคล)
              </button>
              <button
                type="button"
                onClick={() => setLoanMode('flat')}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                  loanMode === 'flat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                ดอกเบี้ยคงที่ (Flat Rate รถยนต์)
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  วงเงินกู้ (บาท)
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={loanPrincipal}
                  onChange={(e) => setLoanPrincipal(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    อัตราดอกเบี้ย (% ต่อปี)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={loanRate}
                    onChange={(e) => setLoanRate(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ระยะเวลาผ่อน (เดือน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={loanMonths}
                    onChange={(e) =>
                      setLoanMonths(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              {loanMode === 'reducing' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    จำลองโปะเพิ่มต่อเดือน (บาท/เดือน)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={loanExtra}
                    onChange={(e) => setLoanExtra(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  onAddCalculatedDebt({
                    name:
                      loanMode === 'reducing'
                        ? 'สินเชื่อธนาคาร (ลดต้นลดดอก)'
                        : 'สินเชื่อเช่าซื้อ (Flat Rate)',
                    category: loanMode === 'reducing' ? 'personal_loan' : 'auto_loan',
                    principal: loanPrincipal,
                    rateInput:
                      loanMode === 'flat'
                        ? Number(loanResult.effectiveAnnualRate.toFixed(2))
                        : loanRate,
                    ratePeriod: 'year',
                    annualRate:
                      loanMode === 'flat'
                        ? Number(loanResult.effectiveAnnualRate.toFixed(2))
                        : loanRate,
                    interestType: loanMode === 'reducing' ? 'reducing' : 'flat',
                    minPayment: Math.ceil(loanResult.monthlyPayment),
                    dueDay: 25,
                  })
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                เพิ่มสินเชื่อนี้เข้าแผนปลดหนี้
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ค่างวดต่อเดือนตามสัญญา</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-slate-900 tabular-nums">
                  {formatTHB(loanResult.monthlyPayment)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ดอกเบี้ยรวมตามสัญญา</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-rose-600 tabular-nums">
                  {formatTHB(loanResult.totalInterest)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">
                  {loanMode === 'flat'
                    ? 'ดอกเบี้ยเทียบเท่าลดต้นลดดอก (EIR)'
                    : 'ยอดชำระรวมทั้งหมด'}
                </p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-teal-700 tabular-nums">
                  {loanMode === 'flat'
                    ? `${loanResult.effectiveAnnualRate.toFixed(2)}%/ปี`
                    : formatTHB(loanResult.totalPayment)}
                </p>
              </div>
            </div>

            {loanMode === 'reducing' && loanExtra > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900">
                <p className="font-semibold">
                  ผลลัพธ์จากการโปะเพิ่มเดือนละ {formatTHB(loanExtra)}:
                </p>
                <p className="mt-1 tabular-nums">
                  ประหยัดดอกเบี้ยได้{' '}
                  <span className="font-bold">{formatTHB(loanResult.interestSaved)}</span>{' '}
                  และหมดหนี้เร็วขึ้น{' '}
                  <span className="font-bold">
                    {formatDurationThai(loanResult.monthsSaved)}
                  </span>{' '}
                  (จาก {loanMonths} เดือน เหลือ {loanResult.monthsWithExtra} เดือน)
                </p>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2">งวด</th>
                    <th className="px-4 py-2 text-right">ชำระ/เดือน</th>
                    <th className="px-4 py-2 text-right">ตัดเงินต้น</th>
                    <th className="px-4 py-2 text-right">ดอกเบี้ย</th>
                    <th className="px-4 py-2 text-right">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loanResult.schedule.slice(0, 60).map((row) => (
                    <tr key={row.month}>
                      <td className="px-4 py-2 font-mono-num text-slate-500">
                        {row.month}
                      </td>
                      <td className="px-4 py-2 text-right font-mono-num tabular-nums">
                        {formatTHB(row.payment)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono-num text-teal-700 tabular-nums">
                        {formatTHB(row.principalPaid)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono-num text-rose-600 tabular-nums">
                        {formatTHB(row.interestPaid)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono-num font-medium tabular-nums">
                        {formatTHB(row.endingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. DAILY LOAN INTEREST CALCULATOR */}
      {subTab === 'daily' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                คำนวณดอกเบี้ยเงินกู้รายวัน
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                วิเคราะห์ต้นทุนแท้จริงของเงินกู้ดอกลอยรายวัน หรือผ่อนส่งรายวัน
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setDailyMode('daily_installment')}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                  dailyMode === 'daily_installment'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                ส่งรายวัน (รวมต้น+ดอก)
              </button>
              <button
                type="button"
                onClick={() => setDailyMode('interest_only')}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                  dailyMode === 'interest_only'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                ดอกลอยรายวัน (ต้นไม่ลด)
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  ยอดเงินต้นที่กู้มาจริง (บาท)
                </label>
                <input
                  type="number"
                  min={0}
                  value={dailyPrincipal}
                  onChange={(e) => setDailyPrincipal(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                />
              </div>

              {dailyMode === 'interest_only' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      ดอกเบี้ย (% ต่อวัน)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={dailyRatePct}
                      onChange={(e) => setDailyRatePct(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      ระยะเวลาถือเงิน (วัน)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={dailyDays}
                      onChange={(e) =>
                        setDailyDays(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      ยอดส่งรายวัน (บาท/วัน)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={dailyPaymentAmt}
                      onChange={(e) => setDailyPaymentAmt(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      จำนวนวันที่ต้องส่ง (วัน)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={dailyDays}
                      onChange={(e) =>
                        setDailyDays(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  onAddCalculatedDebt({
                    name: 'เงินกู้รายวัน',
                    category: 'daily_loan',
                    principal: dailyPrincipal,
                    rateInput: Number(dailyResult.equivalentAnnualRate.toFixed(1)),
                    ratePeriod: 'year',
                    annualRate: Number(dailyResult.equivalentAnnualRate.toFixed(1)),
                    interestType:
                      dailyMode === 'interest_only' ? 'interest_only' : 'reducing',
                    minPayment: Math.ceil(
                      dailyMode === 'interest_only'
                        ? dailyResult.monthlyInterestCost
                        : dailyPaymentAmt * 30
                    ),
                    dueDay: new Date().getDate(),
                  })
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                เพิ่มหนี้กู้รายวันนี้เข้าแผนปลดหนี้
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ดอกเบี้ยต่อวันเฉลี่ย</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-rose-600 tabular-nums">
                  {formatTHB(dailyResult.dailyInterestCost, 2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ดอกเบี้ยรวม ({dailyDays} วัน)</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-slate-900 tabular-nums">
                  {formatTHB(dailyResult.totalInterestPaid)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">อัตราดอกเบี้ยต่อปีเทียบเท่า (APR)</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-rose-700 tabular-nums">
                  {dailyResult.equivalentAnnualRate.toFixed(1)}%/ปี
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>ภาระดอกเบี้ยเฉลี่ยต่อ 30 วัน</span>
                <span className="font-mono-num font-semibold text-slate-900 tabular-nums">
                  {formatTHB(dailyResult.monthlyInterestCost)} / เดือน
                </span>
              </div>
              <div className="flex justify-between">
                <span>อัตราดอกเบี้ยต่อเดือนเทียบเท่า</span>
                <span className="font-mono-num font-semibold text-slate-900 tabular-nums">
                  {dailyResult.equivalentMonthlyRate.toFixed(2)}% / เดือน
                </span>
              </div>
              <div className="flex justify-between">
                <span>เงินต้น + ดอกเบี้ยที่ต้องคืนรวมทั้งหมด</span>
                <span className="font-mono-num font-semibold text-slate-900 tabular-nums">
                  {formatTHB(dailyResult.totalRepayment)}
                </span>
              </div>
            </div>

            {dailyResult.equivalentAnnualRate > 15 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
                ข้อควรรู้ตามกฎหมาย: เพดานดอกเบี้ยเงินกู้ทั่วไปตามประมวลกฎหมายแพ่งฯ
                กำหนดไว้ไม่เกิน 15% ต่อปี หนี้นอกระบบรายวันนี้คิดเทียบเท่า{' '}
                <span className="font-bold">
                  {dailyResult.equivalentAnnualRate.toFixed(0)}% ต่อปี
                </span>{' '}
                ควรวางแผนปิดยอดนี้ก่อนเป็นลำดับแรกสุด
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PAWNSHOP CALCULATOR */}
      {subTab === 'pawn' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                คำนวณดอกเบี้ยจำนำสิ่งของและวันไถ่ถอน
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                รองรับเกณฑ์อัตราดอกเบี้ยขั้นบันไดโรงรับจำนำรัฐและโรงรับจำนำเอกชน
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPawnMode('municipal_tiered')}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                  pawnMode === 'municipal_tiered'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                ขั้นบันได (สถานธนานุบาล)
              </button>
              <button
                type="button"
                onClick={() => setPawnMode('custom_flat')}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                  pawnMode === 'custom_flat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                อัตราเดียว (เอกชน/กำหนดเอง)
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  ทรัพย์สินที่จำนำ
                </label>
                <input
                  type="text"
                  value={pawnItemName}
                  onChange={(e) => setPawnItemName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ยอดเงินจำนำ (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pawnPrincipal}
                    onChange={(e) => setPawnPrincipal(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    จำนวนวันที่จำนำ (วัน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    value={pawnDays}
                    onChange={(e) =>
                      setPawnDays(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              {pawnMode === 'municipal_tiered' ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700">
                      เพดานขั้นแรก (บาท)
                    </label>
                    <input
                      type="number"
                      value={pawnTier1Limit}
                      onChange={(e) => setPawnTier1Limit(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono-num text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700">
                      ดอกขั้นแรก (%/ด.)
                    </label>
                    <input
                      type="number"
                      step={0.05}
                      value={pawnTier1Rate}
                      onChange={(e) => setPawnTier1Rate(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono-num text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700">
                      ส่วนเกิน (%/ด.)
                    </label>
                    <input
                      type="number"
                      step={0.05}
                      value={pawnTier2Rate}
                      onChange={(e) => setPawnTier2Rate(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono-num text-xs tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    อัตราดอกเบี้ย (% ต่อเดือน)
                  </label>
                  <input
                    type="number"
                    step={0.05}
                    value={pawnCustomRate}
                    onChange={(e) => setPawnCustomRate(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  วันที่นำมาจำนำ (เพื่อคำนวณวันหลุดจำนำ 4 เดือน 30 วัน)
                </label>
                <input
                  type="date"
                  value={pawnDateStr}
                  onChange={(e) => setPawnDateStr(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={pawnHalfRule}
                  onChange={(e) => setPawnHalfRule(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                />
                ใช้เกณฑ์คิดครึ่งเดือน (ไม่เกิน 15 วันคิด 0.5 เดือน, เกิน 15 วันคิด 1 เดือน)
              </label>

              <button
                type="button"
                onClick={() =>
                  onAddCalculatedDebt({
                    name: `ตั๋วจำนำ: ${pawnItemName || 'สิ่งของ'}`,
                    category: 'pawnshop',
                    principal: pawnPrincipal,
                    rateInput: Number(pawnResult.effectiveAnnualRate.toFixed(2)),
                    ratePeriod: 'year',
                    annualRate: Number(pawnResult.effectiveAnnualRate.toFixed(2)),
                    interestType: 'interest_only',
                    minPayment: Math.ceil(pawnResult.monthlyInterest),
                    dueDay: parseLocalISODate(pawnDateStr).getDate() || 15,
                    notes: `ครบกำหนดตั๋ว ${pawnResult.expiryDateLabel}`,
                  })
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                เพิ่มตั๋วจำนำเข้าแผนปลดหนี้
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ยอดไถ่ถอนรวม (ต้น+ดอก)</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-teal-700 tabular-nums">
                  {formatTHB(pawnResult.redemptionTotal, 2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ดอกเบี้ยรวมตามระยะเวลา</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-rose-600 tabular-nums">
                  {formatTHB(pawnResult.totalInterest, 2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ดอกเบี้ยต่อ 1 เดือน (ส่งดอก)</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-slate-900 tabular-nums">
                  {formatTHB(pawnResult.monthlyInterest, 2)}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>จำนวนงวดเดือนที่ใช้คำนวณดอกเบี้ย</span>
                <span className="font-mono-num font-semibold text-slate-900 tabular-nums">
                  {pawnResult.effectiveBillingMonths} เดือน
                </span>
              </div>
              <div className="flex justify-between">
                <span>อัตราดอกเบี้ยเฉลี่ยต่อปี</span>
                <span className="font-mono-num font-semibold text-slate-900 tabular-nums">
                  {pawnResult.effectiveAnnualRate.toFixed(2)}% ต่อปี
                </span>
              </div>
              <div className="flex justify-between">
                <span>วันครบกำหนดอายุตั๋ว (4 เดือน 30 วัน)</span>
                <span className="font-semibold text-amber-700">
                  {pawnResult.expiryDateLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MORTGAGE CALCULATOR */}
      {subTab === 'mortgage' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                คำนวณการจำนองทรัพย์สิน (บ้าน / ที่ดิน / รถยนต์)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                ประเมิน LTV ค่าธรรมเนียมจดจำนอง ค่างวด และดอกเบี้ยตลอดสัญญา
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  ชื่อทรัพย์สิน / สัญญาจำนอง
                </label>
                <input
                  type="text"
                  value={mortAssetName}
                  onChange={(e) => setMortAssetName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ราคาประเมินทรัพย์สิน (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={mortAppraised}
                    onChange={(e) => setMortAppraised(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    วงเงินจำนองที่ขอกู้ (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={mortLoan}
                    onChange={(e) => setMortLoan(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ดอกเบี้ย (% ต่อปี)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={mortRate}
                    onChange={(e) => setMortRate(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ระยะเวลาสัญญา (เดือน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={mortMonths}
                    onChange={(e) =>
                      setMortMonths(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMortType('amortizing')}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    mortType === 'amortizing'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  ผ่อนลดต้นลดดอกรายเดือน
                </button>
                <button
                  type="button"
                  onClick={() => setMortType('interest_only')}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    mortType === 'interest_only'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  ส่งเฉพาะดอกเบี้ย (ไถ่ถอนทีหลัง)
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={mortFees}
                  onChange={(e) => setMortFees(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-teal-600"
                />
                คำนวณค่าจดจำนองกรมที่ดิน 1% + อากรแสตมป์ 0.05%
              </label>

              <button
                type="button"
                onClick={() =>
                  onAddCalculatedDebt({
                    name: mortAssetName || 'หนี้จำนองทรัพย์สิน',
                    category: 'mortgage',
                    principal: mortLoan,
                    rateInput: mortRate,
                    ratePeriod: 'year',
                    annualRate: mortRate,
                    interestType:
                      mortType === 'amortizing' ? 'reducing' : 'interest_only',
                    minPayment: Math.ceil(mortResult.monthlyPayment),
                    dueDay: 28,
                  })
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                เพิ่มหนี้จำนองนี้เข้าแผนปลดหนี้
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ค่างวด / ดอกเบี้ยต่อเดือน</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-teal-700 tabular-nums">
                  {formatTHB(mortResult.monthlyPayment)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ดอกเบี้ยรวมตลอดสัญญา</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-rose-600 tabular-nums">
                  {formatTHB(mortResult.totalInterest)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">สัดส่วนวงเงินต่อมูลค่า (LTV)</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-slate-900 tabular-nums">
                  {mortResult.ltvPercent.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>ค่าธรรมเนียมจดจำนอง (1%)</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(mortResult.registrationFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ค่าอากรแสตมป์ (0.05% สูงสุด 10,000 บาท)</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(mortResult.stampDuty)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>เงินรับสุทธิหลังหักค่าธรรมเนียมวันจดจำนอง</span>
                <span className="font-mono-num font-semibold text-emerald-700 tabular-nums">
                  {formatTHB(mortResult.netDisbursedAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ยอดชำระรวมตลอดสัญญา (เงินต้น + ดอกเบี้ย)</span>
                <span className="font-mono-num font-semibold text-slate-900 tabular-nums">
                  {formatTHB(mortResult.totalRepayment)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. PRODUCT INSTALLMENT (0% 10M / WITH INTEREST) */}
      {subTab === 'installment' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                คำนวณผ่อนสินค้า (เช่น 0% 10 เดือน / ผ่อนมีดอกเบี้ย)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                หาเงินต้น + ดอกเบี้ยที่ต้องจ่ายทั้งหมด พร้อมเทียบความคุ้มค่ากับซื้อเงินสด
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  ชื่อสินค้า
                </label>
                <input
                  type="text"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ราคาสินค้าเต็ม (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={instPrice}
                    onChange={(e) => setInstPrice(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    เงินดาวน์ (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={instDown}
                    onChange={(e) => setInstDown(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  จำนวนงวดผ่อน (เดือน)
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[3, 6, 10, 12, 18, 24, 36].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInstMonths(m)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        instMonths === m
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m} ด.
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={instMonths}
                    onChange={(e) =>
                      setInstMonths(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-16 rounded-md border border-slate-200 px-2 py-1 text-center font-mono-num text-xs tabular-nums"
                    aria-label="กำหนดจำนวนเดือนเอง"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  รูปแบบอัตราดอกเบี้ย
                </label>
                <div className="mt-1 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setInstRateType('zero')}
                    className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                      instRateType === 'zero'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    ผ่อน 0%
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstRateType('monthly_flat')}
                    className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                      instRateType === 'monthly_flat'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    % ต่อเดือน
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstRateType('annual_flat')}
                    className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                      instRateType === 'annual_flat'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    % ต่อปี
                  </button>
                </div>
              </div>

              {instRateType !== 'zero' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    อัตราดอกเบี้ย (
                    {instRateType === 'monthly_flat' ? '% ต่อเดือน' : '% ต่อปี'})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={instRateVal}
                    onChange={(e) => setInstRateVal(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ส่วนลดเมื่อซื้อเงินสด (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={instCashDiscount}
                    onChange={(e) => setInstCashDiscount(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    เครดิตเงินคืนบัตร (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={instCashback}
                    onChange={(e) => setInstCashback(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onAddCalculatedDebt({
                    name: `ผ่อนสินค้า: ${instName || 'สินค้า'} (${instMonths} ด.)`,
                    category: 'installment',
                    principal: Math.ceil(instResult.financedPrincipal),
                    rateInput: Number(instResult.effectiveAnnualRate.toFixed(2)),
                    ratePeriod: 'year',
                    annualRate: Number(instResult.effectiveAnnualRate.toFixed(2)),
                    interestType: 'flat',
                    minPayment: Math.ceil(instResult.monthlyPayment),
                    dueDay: 25,
                    remainingMonths: instMonths,
                  })
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                เพิ่มยอดผ่อนสินค้านี้เข้าแผนปลดหนี้
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ค่างวดที่ต้องผ่อนต่อเดือน</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-teal-700 tabular-nums">
                  {formatTHB(instResult.monthlyPayment, 2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">เงินต้น + ดอกเบี้ยที่ต้องจ่ายรวม</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-slate-900 tabular-nums">
                  {formatTHB(instResult.totalInstallmentCost, 2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">ดอกเบี้ยรวมตลอดสัญญา</p>
                <p className="mt-1.5 font-mono-num text-xl font-bold text-rose-600 tabular-nums">
                  {formatTHB(instResult.totalInterest, 2)}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>เงินต้นยอดจัดผ่อน (ราคาสินค้า - เงินดาวน์)</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(instResult.financedPrincipal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ดอกเบี้ยเฉลี่ยต่องวด</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(instResult.monthlyInterest, 2)} / เดือน
                </span>
              </div>
              <div className="flex justify-between">
                <span>อัตราดอกเบี้ยแท้จริงต่อปี (EIR)</span>
                <span className="font-mono-num font-semibold text-slate-900 tabular-nums">
                  {instResult.effectiveAnnualRate.toFixed(2)}% ต่อปี
                </span>
              </div>
              <div className="flex justify-between">
                <span>ราคาซื้อเงินสดหลังหักส่วนลด {instCashDiscount}%</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(instResult.cashPriceAfterDiscount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ยอดจ่ายผ่อนสุทธิหลังหักเครดิตเงินคืน</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(instResult.netInstallmentAfterCashback)}
                </span>
              </div>
            </div>

            <div
              className={`rounded-lg border px-4 py-3 text-xs ${
                instResult.differenceVsCash > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {instResult.differenceVsCash > 0 ? (
                <span>
                  การผ่อนสินค้านี้มีต้นทุนรวม (รวมส่วนต่างส่วนลดเงินสด) แพงกว่าจ่ายเงินสด{' '}
                  <span className="font-bold tabular-nums">
                    {formatTHB(instResult.differenceVsCash)}
                  </span>
                </span>
              ) : (
                <span>
                  โปรโมชั่นผ่อนนี้คุ้มค่ากว่าจ่ายเงินสดอยู่{' '}
                  <span className="font-bold tabular-nums">
                    {formatTHB(Math.abs(instResult.differenceVsCash))}
                  </span>{' '}
                  (แนะนำเก็บเงินสดไว้ในบัญชีออมทรัพย์ดอกเบี้ยสูงระหว่างผ่อน)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
