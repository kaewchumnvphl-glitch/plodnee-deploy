import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import {
  DebtItem,
  PayoffStrategy,
  ReminderSettings,
  SimulationResult,
} from '../types/finance';
import {
  formatDurationThai,
  formatTHB,
  getCurrentMonthKey,
  getDebtDueInfo,
  getMonthlyInterestEstimate,
} from '../utils/financeMath';
import { PayoffTrajectoryChart } from './Charts';

interface OverviewPlannerProps {
  debts: DebtItem[];
  totalIncome: number;
  totalExpenses: number;
  totalMinDebt: number;
  extraBudget: number;
  onChangeExtraBudget: (val: number) => void;
  strategy: PayoffStrategy;
  onChangeStrategy: (s: PayoffStrategy) => void;
  avalancheSim: SimulationResult;
  snowballSim: SimulationResult;
  minimumSim: SimulationResult;
  reminderSettings: ReminderSettings;
  onTogglePaidThisMonth: (debtId: string) => void;
  onNavigateTab: (tab: 'debts' | 'analytics' | 'cashflow') => void;
  onOpenAddDebt: () => void;
}

export const OverviewPlanner: React.FC<OverviewPlannerProps> = ({
  debts,
  totalIncome,
  totalExpenses,
  totalMinDebt,
  extraBudget,
  onChangeExtraBudget,
  strategy,
  onChangeStrategy,
  avalancheSim,
  snowballSim,
  minimumSim,
  reminderSettings,
  onTogglePaidThisMonth,
  onNavigateTab,
  onOpenAddDebt,
}) => {
  const activeDebts = debts.filter((d) => d.principal > 0);
  const totalDebt = activeDebts.reduce((s, d) => s + d.principal, 0);
  const monthlyInterestTotal = activeDebts.reduce(
    (s, d) => s + getMonthlyInterestEstimate(d),
    0
  );

  const netSurplus = Math.max(0, totalIncome - totalExpenses - totalMinDebt);
  const recommendedExtra = Math.round(netSurplus * 0.8);
  const sliderMax = Math.max(netSurplus + 5000, extraBudget, 20000);

  const selectedSim =
    strategy === 'snowball'
      ? snowballSim
      : strategy === 'minimum'
        ? minimumSim
        : avalancheSim;

  const interestSaved = Math.max(
    0,
    minimumSim.totalInterestPaid - selectedSim.totalInterestPaid
  );
  const monthsSaved = Math.max(
    0,
    minimumSim.totalMonths - selectedSim.totalMonths
  );
  const recommendedTotalMonthly =
    totalMinDebt + (strategy === 'minimum' ? 0 : extraBudget);

  const currentMonthKey = getCurrentMonthKey();

  const urgentDebts = activeDebts
    .map((d) => ({
      debt: d,
      due: getDebtDueInfo(d, reminderSettings.leadDays),
    }))
    .filter(
      ({ due }) =>
        due.status === 'overdue' ||
        due.status === 'today' ||
        due.status === 'soon'
    )
    .sort((a, b) => a.due.daysDiff - b.due.daysDiff);

  if (activeDebts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          ยังไม่มีรายการหนี้สินคงค้างในแผน
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
          เริ่มต้นเพิ่มหนี้สินทุกช่องทางของคุณ (บัตรเครดิต สินเชื่อ ผ่อนสินค้า หรือเงินกู้)
          เพื่อให้ระบบคำนวณยอดชำระรายเดือนและวันปลอดหนี้ที่เร็วที่สุด
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={onOpenAddDebt}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 whitespace-nowrap"
          >
            เพิ่มรายการหนี้สินแรก
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('cashflow')}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            จัดการรายรับ-รายจ่าย
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Urgent Due Date Banner */}
      {urgentDebts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-3.5">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                แจ้งเตือนครบกำหนดชำระ ({urgentDebts.length} รายการเร่งด่วน)
              </p>
              <p className="mt-0.5 text-xs text-slate-700">
                {urgentDebts
                  .slice(0, 3)
                  .map(
                    ({ debt, due }) =>
                      `${debt.name} (${due.statusLabel} · ขั้นต่ำ ${formatTHB(debt.minPayment)})`
                  )
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('debts')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-50 whitespace-nowrap shrink-0"
          >
            จัดการวันครบกำหนด
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Negative Amortization Warning */}
      {selectedSim.hasNegativeAmortization && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="text-xs leading-relaxed text-rose-900">
            <span className="font-semibold">
              ยอดชำระบางรายการต่ำกว่าดอกเบี้ยรายเดือน:
            </span>{' '}
            {selectedSim.stalledDebtNames.length > 0
              ? selectedSim.stalledDebtNames.join(', ')
              : 'หนี้บางรายการ'}{' '}
            จะไม่ลดเงินต้นหากไม่เพิ่มงบโปะ กรุณาเพิ่มยอดโปะหนี้ต่อเดือนหรือปรับยอดผ่อนขั้นต่ำ
          </div>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">หนี้สินคงเหลือรวม</p>
          <p className="mt-2 font-mono-num text-2xl font-bold text-slate-900 tabular-nums">
            {formatTHB(totalDebt)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {activeDebts.length} ช่องทาง · ดอกเบี้ย ~{formatTHB(monthlyInterestTotal)}/ด.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            ยอดชำระที่แนะนำต่อเดือน
          </p>
          <p className="mt-2 font-mono-num text-2xl font-bold text-teal-700 tabular-nums">
            {formatTHB(recommendedTotalMonthly)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            ขั้นต่ำ {formatTHB(totalMinDebt)} + โปะเพิ่ม{' '}
            {formatTHB(strategy === 'minimum' ? 0 : extraBudget)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            คาดว่าจะปลอดหนี้จริง
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">
            {selectedSim.totalMonths >= 360
              ? 'เกิน 30 ปี'
              : formatDurationThai(selectedSim.totalMonths)}
          </p>
          <p className="mt-1.5 truncate text-xs text-slate-500">
            {selectedSim.months[selectedSim.months.length - 1]?.dateLabel ?? '-'} ·{' '}
            {monthsSaved > 0
              ? `เร็วขึ้น ${monthsSaved} เดือน`
              : 'เทียบกับแผนขั้นต่ำ'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            ดอกเบี้ยที่ประหยัดได้
          </p>
          <p className="mt-2 font-mono-num text-2xl font-bold text-emerald-700 tabular-nums">
            {formatTHB(interestSaved)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            ดอกเบี้ยรวมในแผน {formatTHB(selectedSim.totalInterestPaid)}
          </p>
        </div>
      </div>

      {/* Payoff Budget Optimizer & Strategy Comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Budget Optimizer */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                ปรับงบโปะหนี้ต่อเดือน (Extra Payoff)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                เงินเหลือสุทธิจากรายรับหักรายจ่ายและขั้นต่ำ:{' '}
                <span className="font-semibold text-slate-800 tabular-nums">
                  {formatTHB(netSurplus)}/เดือน
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="extra-budget-input"
                className="text-xs font-medium text-slate-700"
              >
                งบโปะหนี้เพิ่มต่อเดือน (บาท)
              </label>
              <input
                id="extra-budget-input"
                type="number"
                min={0}
                step={500}
                value={extraBudget}
                onChange={(e) =>
                  onChangeExtraBudget(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-36 rounded-lg border border-slate-200 px-3 py-1.5 text-right font-mono-num text-sm font-semibold text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none"
              />
            </div>

            <input
              type="range"
              min={0}
              max={sliderMax}
              step={250}
              value={Math.min(extraBudget, sliderMax)}
              onChange={(e) => onChangeExtraBudget(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-teal-600"
              aria-label="สไลเดอร์งบโปะหนี้ต่อเดือน"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => onChangeExtraBudget(recommendedExtra)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 font-medium text-teal-800 transition-colors hover:bg-teal-100 whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5" />
                แนะนำ 80% ของเงินเหลือ ({formatTHB(recommendedExtra)})
              </button>
              {netSurplus > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeExtraBudget(Math.round(netSurplus))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                >
                  ทุ่มเต็ม 100% ({formatTHB(netSurplus)})
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-semibold text-slate-700">
              เลือกกลยุทธ์การโปะหนี้
            </h3>
            <div className="mt-3 space-y-2.5">
              {(
                [
                  {
                    id: 'avalanche' as PayoffStrategy,
                    title: 'Avalanche · ปิดดอกเบี้ยแพงที่สุดก่อน',
                    badge: 'คุ้มค่าที่สุด',
                    sim: avalancheSim,
                  },
                  {
                    id: 'snowball' as PayoffStrategy,
                    title: 'Snowball · ปิดยอดเงินต้นเล็กที่สุดก่อน',
                    badge: 'กำลังใจเร็ว',
                    sim: snowballSim,
                  },
                  {
                    id: 'minimum' as PayoffStrategy,
                    title: 'จ่ายขั้นต่ำอย่างเดียว (เปรียบเทียบ)',
                    badge: 'ไม่แนะนำ',
                    sim: minimumSim,
                  },
                ] as const
              ).map((opt) => {
                const isSelected = strategy === opt.id;
                const savedVsMin = Math.max(
                  0,
                  minimumSim.totalInterestPaid - opt.sim.totalInterestPaid
                );
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeStrategy(opt.id)}
                    className={`w-full rounded-lg border p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {opt.title}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          opt.id === 'avalanche'
                            ? 'text-teal-700'
                            : opt.id === 'snowball'
                              ? 'text-sky-700'
                              : 'text-slate-500'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 tabular-nums">
                      <span>หมดหนี้: {formatDurationThai(opt.sim.totalMonths)}</span>
                      <span aria-hidden="true">·</span>
                      <span>ดอกเบี้ยรวม: {formatTHB(opt.sim.totalInterestPaid)}</span>
                      {opt.id !== 'minimum' && savedVsMin > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-emerald-700">
                            ประหยัด {formatTHB(savedVsMin)}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Trajectory Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                กราฟเปรียบเทียบเส้นทางการปลดหนี้
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                เปรียบเทียบยอดหนี้คงเหลือรายเดือนเมื่อใช้งบชำระ{' '}
                {formatTHB(recommendedTotalMonthly)}/เดือน
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              ดูตารางผ่อนรายเดือน
              <TrendingDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <PayoffTrajectoryChart
            avalanche={avalancheSim}
            snowball={snowballSim}
            minimum={minimumSim}
            activeStrategy={strategy}
          />
        </div>
      </div>

      {/* Monthly Action Plan */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              แผนการจัดสรรเงินจ่ายหนี้ประจำเดือนนี้ (เรียงตามลำดับความสำคัญ)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              กลยุทธ์{' '}
              {strategy === 'avalanche'
                ? 'Avalanche — โปะส่วนเกินเข้าก้อนที่ดอกเบี้ยต่อปีสูงสุดก่อน'
                : strategy === 'snowball'
                  ? 'Snowball — โปะส่วนเกินเข้าก้อนที่ยอดคงเหลือน้อยที่สุดก่อน'
                  : 'จ่ายขั้นต่ำทุกก้อน'}
            </p>
          </div>
          <span className="font-mono-num text-sm font-semibold text-slate-900 tabular-nums">
            รวมต้องจ่ายเดือนนี้ {formatTHB(selectedSim.months[0]?.totalPayment ?? 0)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-6 py-3">ลำดับ / รายการหนี้</th>
                <th className="px-4 py-3 text-right">ดอกเบี้ย/ปี</th>
                <th className="px-4 py-3 text-right">ยอดคงเหลือ</th>
                <th className="px-4 py-3 text-right">ขั้นต่ำ</th>
                <th className="px-4 py-3 text-right">โปะเพิ่ม</th>
                <th className="px-4 py-3 text-right">ควรจ่ายรวมเดือนนี้</th>
                <th className="px-6 py-3 text-right">สถานะงวดนี้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedSim.firstMonthPlan
                .slice()
                .sort((a, b) => {
                  const debtA = debts.find((d) => d.id === a.debtId);
                  const debtB = debts.find((d) => d.id === b.debtId);
                  if (!debtA || !debtB) return 0;
                  const extraA = a.payment - debtA.minPayment;
                  const extraB = b.payment - debtB.minPayment;
                  if (Math.abs(extraB - extraA) > 1) return extraB - extraA;
                  return debtB.annualRate - debtA.annualRate;
                })
                .map((slice, idx) => {
                  const debt = debts.find((d) => d.id === slice.debtId);
                  if (!debt) return null;
                  const extraAmt = Math.max(0, slice.payment - debt.minPayment);
                  const isPaid = debt.paidMonths.includes(currentMonthKey);
                  const due = getDebtDueInfo(debt, reminderSettings.leadDays);

                  return (
                    <tr key={slice.debtId} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono-num text-xs font-semibold text-slate-400">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <div className="font-medium text-slate-900">
                              {debt.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              ครบกำหนดวันที่ {debt.dueDay} · {due.statusLabel}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-xs font-medium text-slate-700 tabular-nums">
                        {debt.annualRate.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-slate-700 tabular-nums">
                        {formatTHB(debt.principal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-slate-600 tabular-nums">
                        {formatTHB(debt.minPayment)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-semibold text-teal-700 tabular-nums">
                        {extraAmt > 1 ? `+${formatTHB(extraAmt)}` : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-bold text-slate-900 tabular-nums">
                        {formatTHB(slice.payment)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => onTogglePaidThisMonth(debt.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                            isPaid
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isPaid && <Check className="h-3.5 w-3.5" />}
                          {isPaid ? 'ชำระแล้ว' : 'บันทึกจ่ายแล้ว'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
