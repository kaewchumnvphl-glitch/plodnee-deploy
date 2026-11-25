import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  DEBT_CATEGORY_LABELS,
  DebtCategory,
  DebtItem,
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategory,
  ExpenseItem,
  FREQUENCY_LABELS,
  INCOME_CATEGORY_LABELS,
  IncomeCategory,
  IncomeItem,
  INTEREST_TYPE_LABELS,
  InterestType,
  PaymentFrequency,
  RatePeriod,
} from '../types/finance';
import { toAnnualRate } from '../utils/financeMath';

export type ModalState =
  | { open: false }
  | { open: true; kind: 'income'; editing?: IncomeItem }
  | { open: true; kind: 'expense'; editing?: ExpenseItem }
  | { open: true; kind: 'debt'; editing?: DebtItem };

interface EntryModalProps {
  modal: ModalState;
  onClose: () => void;
  onSaveIncome: (item: Omit<IncomeItem, 'id'>, existingId?: string) => void;
  onSaveExpense: (item: Omit<ExpenseItem, 'id'>, existingId?: string) => void;
  onSaveDebt: (
    item: Omit<DebtItem, 'id' | 'paidMonths'>,
    existingId?: string
  ) => void;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  modal,
  onClose,
  onSaveIncome,
  onSaveExpense,
  onSaveDebt,
}) => {
  const [kindTab, setKindTab] = useState<'debt' | 'income' | 'expense'>('debt');

  // Income fields
  const [incName, setIncName] = useState('');
  const [incCategory, setIncCategory] = useState<IncomeCategory>('salary');
  const [incAmount, setIncAmount] = useState<number>(30000);
  const [incFreq, setIncFreq] = useState<PaymentFrequency>('monthly');
  const [incPayDay, setIncPayDay] = useState<number>(25);

  // Expense fields
  const [expName, setExpName] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('housing');
  const [expAmount, setExpAmount] = useState<number>(5000);

  // Debt fields
  const [debtName, setDebtName] = useState('');
  const [debtCategory, setDebtCategory] = useState<DebtCategory>('credit_card');
  const [debtPrincipal, setDebtPrincipal] = useState<number>(30000);
  const [debtRateInput, setDebtRateInput] = useState<number>(16);
  const [debtRatePeriod, setDebtRatePeriod] = useState<RatePeriod>('year');
  const [debtInterestType, setDebtInterestType] =
    useState<InterestType>('reducing');
  const [debtMinPayment, setDebtMinPayment] = useState<number>(2500);
  const [debtDueDay, setDebtDueDay] = useState<number>(25);
  const [debtNotes, setDebtNotes] = useState('');

  useEffect(() => {
    if (!modal.open) return;
    setKindTab(modal.kind);

    if (modal.kind === 'income') {
      const e = modal.editing;
      setIncName(e?.name ?? '');
      setIncCategory(e?.category ?? 'salary');
      setIncAmount(e?.amount ?? 30000);
      setIncFreq(e?.frequency ?? 'monthly');
      setIncPayDay(e?.payDay ?? 25);
    } else if (modal.kind === 'expense') {
      const e = modal.editing;
      setExpName(e?.name ?? '');
      setExpCategory(e?.category ?? 'housing');
      setExpAmount(e?.amount ?? 5000);
    } else {
      const e = modal.editing;
      setDebtName(e?.name ?? '');
      setDebtCategory(e?.category ?? 'credit_card');
      setDebtPrincipal(e?.principal ?? 30000);
      setDebtRateInput(e?.rateInput ?? 16);
      setDebtRatePeriod(e?.ratePeriod ?? 'year');
      setDebtInterestType(e?.interestType ?? 'reducing');
      setDebtMinPayment(e?.minPayment ?? 2500);
      setDebtDueDay(e?.dueDay ?? 25);
      setDebtNotes(e?.notes ?? '');
    }
  }, [modal]);

  if (!modal.open) return null;

  const isEditing = Boolean(modal.editing);
  const normalizedAnnualRate = toAnnualRate(debtRateInput, debtRatePeriod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kindTab === 'income') {
      if (!incName.trim()) return;
      onSaveIncome(
        {
          name: incName.trim(),
          category: incCategory,
          amount: Math.max(0, Number(incAmount) || 0),
          frequency: incFreq,
          payDay: incPayDay,
        },
        modal.kind === 'income' ? modal.editing?.id : undefined
      );
      onClose();
      return;
    }

    if (kindTab === 'expense') {
      if (!expName.trim()) return;
      onSaveExpense(
        {
          name: expName.trim(),
          category: expCategory,
          amount: Math.max(0, Number(expAmount) || 0),
        },
        modal.kind === 'expense' ? modal.editing?.id : undefined
      );
      onClose();
      return;
    }

    if (!debtName.trim()) return;
    onSaveDebt(
      {
        name: debtName.trim(),
        category: debtCategory,
        principal: Math.max(0, Number(debtPrincipal) || 0),
        rateInput: Math.max(0, Number(debtRateInput) || 0),
        ratePeriod: debtRatePeriod,
        annualRate: normalizedAnnualRate,
        interestType: debtInterestType,
        minPayment: Math.max(0, Number(debtMinPayment) || 0),
        dueDay: Math.min(31, Math.max(1, Number(debtDueDay) || 1)),
        notes: debtNotes.trim() || undefined,
      },
      modal.kind === 'debt' ? modal.editing?.id : undefined
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {isEditing
              ? kindTab === 'debt'
                ? 'แก้ไขรายการหนี้สิน'
                : kindTab === 'income'
                  ? 'แก้ไขช่องทางรายได้'
                  : 'แก้ไขค่าใช้จ่ายจำเป็น'
              : 'บันทึกรายการใหม่เข้าแผนปลดหนี้'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isEditing && (
          <div className="border-b border-slate-100 px-6 pt-3 pb-3">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'debt', label: 'หนี้สิน / ดอกเบี้ย' },
                  { id: 'income', label: 'รายได้' },
                  { id: 'expense', label: 'ค่าใช้จ่ายจำเป็น' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setKindTab(t.id)}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    kindTab === t.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {kindTab === 'income' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  ชื่อช่องทางรายได้
                </label>
                <input
                  type="text"
                  required
                  value={incName}
                  onChange={(e) => setIncName(e.target.value)}
                  placeholder="เช่น เงินเดือนประจำ, รายได้ขายของออนไลน์"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    หมวดหมู่รายได้
                  </label>
                  <select
                    value={incCategory}
                    onChange={(e) => setIncCategory(e.target.value as IncomeCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  >
                    {(Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {INCOME_CATEGORY_LABELS[k]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ความถี่ที่ได้รับ
                  </label>
                  <select
                    value={incFreq}
                    onChange={(e) => setIncFreq(e.target.value as PaymentFrequency)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  >
                    {(Object.keys(FREQUENCY_LABELS) as PaymentFrequency[]).map((k) => (
                      <option key={k} value={k}>
                        {FREQUENCY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    จำนวนเงิน (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={incAmount}
                    onChange={(e) => setIncAmount(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    วันที่เงินเข้า (ถ้ามี)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={incPayDay}
                    onChange={(e) => setIncPayDay(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {kindTab === 'expense' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  ชื่อรายการค่าใช้จ่ายจำเป็น
                </label>
                <input
                  type="text"
                  required
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  placeholder="เช่น ค่าเช่าบ้าน, ค่าอาหาร, ค่าเดินทาง"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    หมวดหมู่
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  >
                    {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {EXPENSE_CATEGORY_LABELS[k]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ยอดจ่ายต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {kindTab === 'debt' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  ชื่อเจ้าหนี้ / รายการหนี้สิน
                </label>
                <input
                  type="text"
                  required
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  placeholder="เช่น บัตรเครดิต, สินเชื่อบ้าน, ผ่อน 0% 10 เดือน"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ประเภทหนี้สิน
                  </label>
                  <select
                    value={debtCategory}
                    onChange={(e) => setDebtCategory(e.target.value as DebtCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  >
                    {(Object.keys(DEBT_CATEGORY_LABELS) as DebtCategory[]).map((k) => (
                      <option key={k} value={k}>
                        {DEBT_CATEGORY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    รูปแบบดอกเบี้ย
                  </label>
                  <select
                    value={debtInterestType}
                    onChange={(e) =>
                      setDebtInterestType(e.target.value as InterestType)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  >
                    {(Object.keys(INTEREST_TYPE_LABELS) as InterestType[]).map((k) => (
                      <option key={k} value={k}>
                        {INTEREST_TYPE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    เงินต้นคงเหลือปัจจุบัน (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={debtPrincipal}
                    onChange={(e) => setDebtPrincipal(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ยอดจ่ายขั้นต่ำ / ค่างวดต่อเดือน
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={debtMinPayment}
                    onChange={(e) => setDebtMinPayment(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                  {debtCategory === 'credit_card' && debtPrincipal > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {[
                        { label: 'ขั้นต่ำ 5%', pct: 0.05 },
                        { label: 'ขั้นต่ำ 8%', pct: 0.08 },
                        { label: 'ขั้นต่ำ 10%', pct: 0.1 },
                        { label: 'เต็มจำนวน', pct: 1 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setDebtMinPayment(
                              preset.pct === 1
                                ? Math.ceil(debtPrincipal)
                                : Math.max(500, Math.ceil(debtPrincipal * preset.pct))
                            )
                          }
                          className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    อัตราดอกเบี้ย (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={debtRateInput}
                    onChange={(e) => setDebtRateInput(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    หน่วยดอกเบี้ย
                  </label>
                  <select
                    value={debtRatePeriod}
                    onChange={(e) => setDebtRatePeriod(e.target.value as RatePeriod)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  >
                    <option value="year">% ต่อปี</option>
                    <option value="month">% ต่อเดือน</option>
                    <option value="day">% ต่อวัน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ครบกำหนดทุกวันที่
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={debtDueDay}
                    onChange={(e) => setDebtDueDay(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono-num text-sm tabular-nums focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              {debtRatePeriod !== 'year' && (
                <p className="text-xs text-slate-500">
                  เทียบเท่าอัตราดอกเบี้ยต่อปี:{' '}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {normalizedAnnualRate.toFixed(2)}% ต่อปี
                  </span>
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={debtNotes}
                  onChange={(e) => setDebtNotes(e.target.value)}
                  placeholder="เช่น เลขที่สัญญา, เงื่อนไขรีไฟแนนซ์"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-700"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
