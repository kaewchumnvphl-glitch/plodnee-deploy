import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategory,
  ExpenseItem,
  FREQUENCY_LABELS,
  INCOME_CATEGORY_LABELS,
  IncomeCategory,
  IncomeItem,
} from '../types/finance';
import { formatTHB, getMonthlyIncomeAmount } from '../utils/financeMath';
import { CashflowAllocationChart } from './Charts';

interface IncomeExpensesViewProps {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  totalMinDebt: number;
  extraBudget: number;
  onAddIncome: () => void;
  onEditIncome: (item: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
  onAddExpense: () => void;
  onEditExpense: (item: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
}

export const IncomeExpensesView: React.FC<IncomeExpensesViewProps> = ({
  incomes,
  expenses,
  totalMinDebt,
  extraBudget,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [incomeFilter, setIncomeFilter] = useState<IncomeCategory | 'all'>('all');
  const [expenseFilter, setExpenseFilter] = useState<ExpenseCategory | 'all'>('all');

  const totalIncome = useMemo(
    () => incomes.reduce((sum, i) => sum + getMonthlyIncomeAmount(i), 0),
    [incomes]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Math.max(0, e.amount), 0),
    [expenses]
  );

  const netSurplusForDebt = totalIncome - totalExpenses - totalMinDebt;
  const dsrPercent =
    totalIncome > 0 ? ((totalMinDebt + extraBudget) / totalIncome) * 100 : 0;
  const minDsrPercent = totalIncome > 0 ? (totalMinDebt / totalIncome) * 100 : 0;

  const filteredIncomes = useMemo(() => {
    if (incomeFilter === 'all') return incomes;
    return incomes.filter((i) => i.category === incomeFilter);
  }, [incomes, incomeFilter]);

  const filteredExpenses = useMemo(() => {
    if (expenseFilter === 'all') return expenses;
    return expenses.filter((e) => e.category === expenseFilter);
  }, [expenses, expenseFilter]);

  const incomeByCategory = useMemo(() => {
    const map = new Map<IncomeCategory, number>();
    for (const item of incomes) {
      map.set(
        item.category,
        (map.get(item.category) ?? 0) + getMonthlyIncomeAmount(item)
      );
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [incomes]);

  return (
    <div className="space-y-6">
      {/* Top Cashflow Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">รายได้รวมเฉลี่ย/เดือน</p>
          <p className="mt-2 font-mono-num text-2xl font-bold text-slate-900 tabular-nums">
            {formatTHB(totalIncome)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            จาก {incomes.length} ช่องทางรายได้
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">ค่าใช้จ่ายจำเป็น/เดือน</p>
          <p className="mt-2 font-mono-num text-2xl font-bold text-slate-900 tabular-nums">
            {formatTHB(totalExpenses)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {totalIncome > 0
              ? `${((totalExpenses / totalIncome) * 100).toFixed(1)}% ของรายได้รวม`
              : 'ยังไม่มีข้อมูลรายได้'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            เงินเหลือสุทธิหลังหักหนี้ขั้นต่ำ
          </p>
          <p
            className={`mt-2 font-mono-num text-2xl font-bold tabular-nums ${
              netSurplusForDebt >= 0 ? 'text-teal-700' : 'text-rose-600'
            }`}
          >
            {formatTHB(netSurplusForDebt)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            ความสามารถในการโปะหนี้เพิ่มต่อเดือน
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            ภาระหนี้ต่อรายได้ (DSR)
          </p>
          <p
            className={`mt-2 font-mono-num text-2xl font-bold tabular-nums ${
              minDsrPercent > 45
                ? 'text-rose-600'
                : minDsrPercent > 35
                  ? 'text-amber-600'
                  : 'text-emerald-700'
            }`}
          >
            {minDsrPercent.toFixed(1)}%
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            รวมงบโปะ: {dsrPercent.toFixed(1)}% (เกณฑ์ปลอดภัยขั้นต่ำ ≤ 35%)
          </p>
        </div>
      </div>

      {/* Allocation Bar & Income Channel Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="text-base font-semibold text-slate-900">
            สัดส่วนการจัดสรรกระแสเงินสดรายเดือน
          </h2>
          <p className="mt-0.5 mb-5 text-xs text-slate-500">
            โครงสร้างรายได้เทียบค่าใช้จ่ายจำเป็น ยอดผ่อนขั้นต่ำ และงบโปะหนี้
          </p>
          <CashflowAllocationChart
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            totalMinDebt={totalMinDebt}
            extraBudget={extraBudget}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="text-base font-semibold text-slate-900">
            จำแนกสัดส่วนรายได้ตามช่องทาง
          </h2>
          <p className="mt-0.5 mb-4 text-xs text-slate-500">
            รวมรายได้ประจำ รายได้เสริม และการลงทุนปรับฐานเป็นรายเดือน
          </p>
          {incomeByCategory.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              ยังไม่มีรายการรายได้
            </p>
          ) : (
            <div className="space-y-3">
              {incomeByCategory.map(([cat, amt]) => {
                const share = totalIncome > 0 ? (amt / totalIncome) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        {INCOME_CATEGORY_LABELS[cat]}
                      </span>
                      <span className="font-mono-num text-slate-900 tabular-nums">
                        {formatTHB(amt)} ({share.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-100">
                      <div
                        className="h-full bg-teal-600"
                        style={{ width: `${Math.max(3, share)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Tables: Incomes & Expenses */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Incomes Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                ช่องทางรายได้ทั้งหมด
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                จำแนกรายรับทุกทางเพื่อคำนวณศักยภาพการปลดหนี้
              </p>
            </div>
            <button
              type="button"
              onClick={onAddIncome}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-700 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มรายได้
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-6 py-2.5">
            <button
              type="button"
              onClick={() => setIncomeFilter('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                incomeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด
            </button>
            {(Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setIncomeFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  incomeFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {INCOME_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {filteredIncomes.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              ไม่มีรายการรายได้ในหมวดนี้
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredIncomes.map((item) => {
                const monthly = getMonthlyIncomeAmount(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {INCOME_CATEGORY_LABELS[item.category]} ·{' '}
                        {FREQUENCY_LABELS[item.frequency]}
                        {item.payDay ? ` · เข้าวันที่ ${item.payDay}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="font-mono-num text-sm font-semibold text-emerald-700 tabular-nums">
                          +{formatTHB(monthly)}/ด.
                        </p>
                        {item.frequency !== 'monthly' && (
                          <p className="text-[11px] text-slate-400 tabular-nums">
                            ({formatTHB(item.amount)}/{FREQUENCY_LABELS[item.frequency]})
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditIncome(item)}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`แก้ไข ${item.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteIncome(item.id)}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`ลบ ${item.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                ค่าใช้จ่ายจำเป็นรายเดือน
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                ค่าครองชีพพื้นฐานเพื่อหักลบหาเงินเหลือสำหรับโปะหนี้
              </p>
            </div>
            <button
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มค่าใช้จ่าย
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-6 py-2.5">
            <button
              type="button"
              onClick={() => setExpenseFilter('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                expenseFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด
            </button>
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setExpenseFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  expenseFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {EXPENSE_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              ไม่มีรายการค่าใช้จ่ายในหมวดนี้
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredExpenses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {EXPENSE_CATEGORY_LABELS[item.category]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-mono-num text-sm font-semibold text-slate-900 tabular-nums">
                      -{formatTHB(item.amount)}/ด.
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditExpense(item)}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`แก้ไข ${item.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(item.id)}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`ลบ ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
