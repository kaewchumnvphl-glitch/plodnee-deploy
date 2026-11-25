import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { DebtItem, PayoffStrategy, SimulationResult } from '../types/finance';
import { formatDurationThai, formatTHB } from '../utils/financeMath';
import {
  CashflowAllocationChart,
  DebtCompositionChart,
  PayoffTrajectoryChart,
} from './Charts';

interface AnalyticsScheduleViewProps {
  debts: DebtItem[];
  totalIncome: number;
  totalExpenses: number;
  totalMinDebt: number;
  extraBudget: number;
  strategy: PayoffStrategy;
  onChangeStrategy: (s: PayoffStrategy) => void;
  avalancheSim: SimulationResult;
  snowballSim: SimulationResult;
  minimumSim: SimulationResult;
}

export const AnalyticsScheduleView: React.FC<AnalyticsScheduleViewProps> = ({
  debts,
  totalIncome,
  totalExpenses,
  totalMinDebt,
  extraBudget,
  strategy,
  onChangeStrategy,
  avalancheSim,
  snowballSim,
  minimumSim,
}) => {
  const [showAllMonths, setShowAllMonths] = useState(false);

  const selectedSim =
    strategy === 'snowball'
      ? snowballSim
      : strategy === 'minimum'
        ? minimumSim
        : avalancheSim;

  const highestRateDebt = useMemo(() => {
    const active = debts.filter((d) => d.principal > 0);
    if (active.length === 0) return null;
    return [...active].sort((a, b) => b.annualRate - a.annualRate)[0];
  }, [debts]);

  const smallestDebt = useMemo(() => {
    const active = debts.filter((d) => d.principal > 0);
    if (active.length === 0) return null;
    return [...active].sort((a, b) => a.principal - b.principal)[0];
  }, [debts]);

  const interestSavedAvalancheVsMin = Math.max(
    0,
    minimumSim.totalInterestPaid - avalancheSim.totalInterestPaid
  );
  const interestDiffAvalancheVsSnowball = Math.max(
    0,
    snowballSim.totalInterestPaid - avalancheSim.totalInterestPaid
  );

  const displayedMonths = showAllMonths
    ? selectedSim.months
    : selectedSim.months.slice(0, 24);

  const handleDownloadCSV = () => {
    if (selectedSim.months.length === 0) return;
    const headers = [
      'งวดที่',
      'เดือน',
      'ยอดชำระรวม',
      'ตัดเงินต้น',
      'จ่ายดอกเบี้ย',
      'ดอกเบี้ยสะสม',
      'หนี้คงเหลือ',
      'ปิดยอดสำเร็จในเดือนนี้',
    ];
    const rows = selectedSim.months.map((m) => [
      m.monthIndex,
      m.dateLabel,
      m.totalPayment.toFixed(2),
      m.totalPrincipalPaid.toFixed(2),
      m.totalInterestPaid.toFixed(2),
      m.cumulativeInterest.toFixed(2),
      m.totalRemainingBalance.toFixed(2),
      m.paidOffNames.join(' | '),
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
        '\n'
      );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plodnee-schedule-${strategy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Strategic Advisory Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              บทวิเคราะห์และคำแนะนำกลยุทธ์การโปะหนี้ที่คุ้มค่าที่สุด
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              เปรียบเทียบข้อมูลจริงจากหนี้สิน {debts.filter((d) => d.principal > 0).length}{' '}
              รายการและงบโปะเพิ่ม {formatTHB(extraBudget)}/เดือน
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(
              [
                { id: 'avalanche', label: 'Avalanche' },
                { id: 'snowball', label: 'Snowball' },
                { id: 'minimum', label: 'ขั้นต่ำ' },
              ] as { id: PayoffStrategy; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeStrategy(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  strategy === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {debts.filter((d) => d.principal > 0).length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-teal-700">
                1. กลยุทธ์ที่คุ้มดอกเบี้ยที่สุด (Avalanche)
              </p>
              <p className="text-xs leading-relaxed text-slate-600">
                {highestRateDebt ? (
                  <>
                    ควรทุ่มงบโปะทั้งหมดไปที่{' '}
                    <span className="font-semibold text-slate-900">
                      {highestRateDebt.name}
                    </span>{' '}
                    ({highestRateDebt.annualRate.toFixed(1)}%/ปี) เป็นอันดับแรก
                    จะประหยัดดอกเบี้ยรวมได้{' '}
                    <span className="font-semibold text-emerald-700 tabular-nums">
                      {formatTHB(interestSavedAvalancheVsMin)}
                    </span>{' '}
                    และหมดหนี้ใน {formatDurationThai(avalancheSim.totalMonths)}
                  </>
                ) : (
                  'ไม่มีข้อมูลหนี้'
                )}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-sky-700">
                2. กลยุทธ์ปิดจำนวนก้อนเร็ว (Snowball)
              </p>
              <p className="text-xs leading-relaxed text-slate-600">
                {smallestDebt ? (
                  <>
                    หากต้องการลดความเครียดจากการผ่อนหลายที่ ให้ปิด{' '}
                    <span className="font-semibold text-slate-900">
                      {smallestDebt.name}
                    </span>{' '}
                    ({formatTHB(smallestDebt.principal)}) ก่อน
                    วิธีนี้จ่ายดอกเบี้ยมากกว่า Avalanche เพียง{' '}
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatTHB(interestDiffAvalancheVsSnowball)}
                    </span>
                  </>
                ) : (
                  'ไม่มีข้อมูลหนี้'
                )}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                3. ผลกระทบหากจ่ายแค่ขั้นต่ำ
              </p>
              <p className="text-xs leading-relaxed text-slate-600">
                หากจ่ายเฉพาะขั้นต่ำโดยไม่โปะเพิ่ม คุณจะใช้เวลา{' '}
                <span className="font-semibold text-slate-900">
                  {formatDurationThai(minimumSim.totalMonths)}
                </span>{' '}
                และเสียดอกเบี้ยรวมสูงถึง{' '}
                <span className="font-semibold text-rose-700 tabular-nums">
                  {formatTHB(minimumSim.totalInterestPaid)}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Trajectory + Composition + Cashflow Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h3 className="mb-1 text-base font-semibold text-slate-900">
            แนวโน้มยอดหนี้คงเหลือรายเดือน
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            เปรียบเทียบความเร็วในการลดเงินต้นระหว่าง 3 แนวทาง
          </p>
          <PayoffTrajectoryChart
            avalanche={avalancheSim}
            snowball={snowballSim}
            minimum={minimumSim}
            activeStrategy={strategy}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h3 className="mb-1 text-base font-semibold text-slate-900">
            โครงสร้างภาระหนี้และดอกเบี้ยต่อเดือน
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            สีแดงคือหนี้ดอกเบี้ยสูง (≥20%/ปี) ที่ควรถูกกำจัดก่อน
          </p>
          <DebtCompositionChart debts={debts} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-1 text-base font-semibold text-slate-900">
          สรุปการจัดสรรรายได้ต่อเดือนเข้าสู่แผนปลดหนี้
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          ภาพรวมกระแสเงินสดจากรายรับ ค่าใช้จ่ายจำเป็น ขั้นต่ำ และงบโปะ
        </p>
        <CashflowAllocationChart
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          totalMinDebt={totalMinDebt}
          extraBudget={extraBudget}
        />
      </div>

      {/* Month-by-month Rollover Amortization Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              ตารางแผนปลดหนี้รายเดือน (แผน{' '}
              {strategy === 'avalanche'
                ? 'Avalanche'
                : strategy === 'snowball'
                  ? 'Snowball'
                  : 'จ่ายขั้นต่ำ'}
              )
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              แสดงยอดตัดเงินต้น ดอกเบี้ย และรายการที่ปิดสำเร็จในแต่ละเดือน
            </p>
          </div>
          {selectedSim.months.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              ดาวน์โหลด CSV
            </button>
          )}
        </div>

        {selectedSim.months.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            ยังไม่มีตารางการผ่อนชำระ กรุณาเพิ่มรายการหนี้สินก่อน
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-6 py-3">งวดที่</th>
                    <th className="px-4 py-3">เดือน / ปี</th>
                    <th className="px-4 py-3 text-right">ยอดชำระรวม</th>
                    <th className="px-4 py-3 text-right">ตัดเงินต้น</th>
                    <th className="px-4 py-3 text-right">จ่ายดอกเบี้ย</th>
                    <th className="px-4 py-3 text-right">หนี้คงเหลือ</th>
                    <th className="px-6 py-3">เหตุการณ์สำคัญ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedMonths.map((row) => (
                    <tr key={row.monthIndex} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-mono-num text-xs text-slate-500 tabular-nums">
                        {row.monthIndex}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-900">
                        {row.dateLabel}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-xs font-semibold text-slate-900 tabular-nums">
                        {formatTHB(row.totalPayment)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-xs text-teal-700 tabular-nums">
                        {formatTHB(row.totalPrincipalPaid)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-xs text-rose-600 tabular-nums">
                        {formatTHB(row.totalInterestPaid)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num text-xs font-medium text-slate-900 tabular-nums">
                        {formatTHB(row.totalRemainingBalance)}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        {row.paidOffNames.length > 0 ? (
                          <span className="font-medium text-emerald-700">
                            ปิดยอดสำเร็จ: {row.paidOffNames.join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            คงเหลือ {row.activeDebtCount} รายการ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSim.months.length > 24 && (
              <div className="border-t border-slate-100 px-6 py-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllMonths((v) => !v)}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  {showAllMonths
                    ? 'ย่อตารางเหลือ 24 เดือนแรก'
                    : `แสดงครบทั้งหมด ${selectedSim.months.length} เดือน`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
