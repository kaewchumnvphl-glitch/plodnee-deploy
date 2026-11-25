import React, { useMemo, useState } from 'react';
import { DebtItem, PayoffStrategy, SimulationResult } from '../types/finance';
import {
  formatCompactTHB,
  formatTHB,
  getMonthlyInterestEstimate,
} from '../utils/financeMath';

interface PayoffTrajectoryChartProps {
  avalanche: SimulationResult;
  snowball: SimulationResult;
  minimum: SimulationResult;
  activeStrategy: PayoffStrategy;
}

export const PayoffTrajectoryChart: React.FC<PayoffTrajectoryChartProps> = ({
  avalanche,
  snowball,
  minimum,
  activeStrategy,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxMonths = useMemo(() => {
    const m = Math.max(
      avalanche.totalMonths,
      snowball.totalMonths,
      Math.min(minimum.totalMonths, Math.max(avalanche.totalMonths, snowball.totalMonths) + 18),
      1
    );
    return Math.min(m, 120);
  }, [avalanche.totalMonths, snowball.totalMonths, minimum.totalMonths]);

  const initialDebt = Math.max(
    avalanche.initialTotalDebt,
    snowball.initialTotalDebt,
    minimum.initialTotalDebt,
    1
  );

  // Build normalized point arrays from month 0 to maxMonths
  const seriesData = useMemo(() => {
    const getBalanceAt = (sim: SimulationResult, monthIdx: number) => {
      if (monthIdx === 0) return sim.initialTotalDebt;
      const found = sim.months[monthIdx - 1];
      if (found) return found.totalRemainingBalance;
      return monthIdx > sim.totalMonths ? 0 : sim.initialTotalDebt;
    };

    const points: {
      monthIdx: number;
      label: string;
      avalanche: number;
      snowball: number;
      minimum: number;
    }[] = [];

    for (let i = 0; i <= maxMonths; i++) {
      const label =
        i === 0
          ? 'วันนี้'
          : minimum.months[i - 1]?.dateLabel ||
            snowball.months[i - 1]?.dateLabel ||
            avalanche.months[i - 1]?.dateLabel ||
            `เดือนที่ ${i}`;

      points.push({
        monthIdx: i,
        label,
        avalanche: getBalanceAt(avalanche, i),
        snowball: getBalanceAt(snowball, i),
        minimum: getBalanceAt(minimum, i),
      });
    }
    return points;
  }, [avalanche, snowball, minimum, maxMonths]);

  const width = 760;
  const height = 270;
  const padLeft = 66;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xFor = (idx: number) =>
    padLeft + (maxMonths === 0 ? 0 : (idx / maxMonths) * plotW);
  const yFor = (val: number) =>
    padTop + plotH - (Math.min(Math.max(val, 0), initialDebt) / initialDebt) * plotH;

  const buildPath = (key: 'avalanche' | 'snowball' | 'minimum') => {
    if (seriesData.length === 0) return '';
    return seriesData
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.monthIdx).toFixed(1)} ${yFor(p[key]).toFixed(1)}`)
      .join(' ');
  };

  const buildArea = (key: 'avalanche' | 'snowball') => {
    if (seriesData.length === 0) return '';
    const line = buildPath(key);
    const lastX = xFor(seriesData[seriesData.length - 1].monthIdx).toFixed(1);
    const firstX = xFor(0).toFixed(1);
    const baseY = (padTop + plotH).toFixed(1);
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTickCount = Math.min(6, maxMonths);
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) =>
    Math.round((i / Math.max(1, xTickCount)) * maxMonths)
  );

  const inspectedPoint =
    hoverIdx !== null && seriesData[hoverIdx] ? seriesData[hoverIdx] : null;

  if (initialDebt <= 1) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
        เพิ่มรายการหนี้สินเพื่อแสดงกราฟเปรียบเทียบเส้นทางการปลดหนี้
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-600" />
            <span>Avalanche (ปิดดอกแพงก่อน)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-600" />
            <span>Snowball (ปิดยอดเล็กก่อน)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
            <span>จ่ายขั้นต่ำอย่างเดียว</span>
          </div>
        </div>
        <span className="text-xs text-slate-500">
          เลื่อนเมาส์บนกราฟเพื่อดูยอดหนี้คงเหลือรายเดือน
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="activeStrategyFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={activeStrategy === 'snowball' ? '#0284c7' : '#0d9488'}
                stopOpacity="0.16"
              />
              <stop
                offset="100%"
                stopColor={activeStrategy === 'snowball' ? '#0284c7' : '#0d9488'}
                stopOpacity="0.01"
              />
            </linearGradient>
          </defs>

          {/* Horizontal Grid */}
          {yTicks.map((t) => {
            const val = initialDebt * t;
            const y = yFor(val);
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px] tabular-nums"
                >
                  {formatCompactTHB(val)}
                </text>
              </g>
            );
          })}

          {/* X-axis Labels */}
          {xTicks.map((tick) => {
            const x = xFor(tick);
            const pt = seriesData[tick];
            return (
              <g key={tick}>
                <line
                  x1={x}
                  y1={padTop + plotH}
                  x2={x}
                  y2={padTop + plotH + 5}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padTop + plotH + 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px] tabular-nums"
                >
                  {tick === 0 ? 'เริ่มต้น' : pt ? `ด.${tick}` : `ด.${tick}`}
                </text>
              </g>
            );
          })}

          {/* Active Strategy Area */}
          {activeStrategy !== 'minimum' && (
            <path
              d={buildArea(activeStrategy === 'snowball' ? 'snowball' : 'avalanche')}
              fill="url(#activeStrategyFill)"
            />
          )}

          {/* Minimum baseline dashed line */}
          <path
            d={buildPath('minimum')}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="5 5"
          />

          {/* Snowball line */}
          <path
            d={buildPath('snowball')}
            fill="none"
            stroke="#0284c7"
            strokeWidth={activeStrategy === 'snowball' ? 3 : 2}
            strokeOpacity={activeStrategy === 'snowball' ? 1 : 0.75}
          />

          {/* Avalanche line */}
          <path
            d={buildPath('avalanche')}
            fill="none"
            stroke="#0d9488"
            strokeWidth={activeStrategy === 'avalanche' ? 3 : 2}
            strokeOpacity={activeStrategy === 'avalanche' ? 1 : 0.75}
          />

          {/* Hover vertical guide and points */}
          {inspectedPoint && (
            <g>
              <line
                x1={xFor(inspectedPoint.monthIdx)}
                y1={padTop}
                x2={xFor(inspectedPoint.monthIdx)}
                y2={padTop + plotH}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={xFor(inspectedPoint.monthIdx)}
                cy={yFor(inspectedPoint.minimum)}
                r="4"
                fill="#94a3b8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={xFor(inspectedPoint.monthIdx)}
                cy={yFor(inspectedPoint.snowball)}
                r="4.5"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={xFor(inspectedPoint.monthIdx)}
                cy={yFor(inspectedPoint.avalanche)}
                r="5"
                fill="#0d9488"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Interactive hit zones per month */}
          {seriesData.map((p) => {
            const sliceW = Math.max(4, plotW / Math.max(1, maxMonths));
            return (
              <rect
                key={p.monthIdx}
                x={xFor(p.monthIdx) - sliceW / 2}
                y={padTop}
                width={sliceW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(p.monthIdx)}
              />
            );
          })}
        </svg>

        {inspectedPoint && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
            <div className="font-semibold text-slate-900">
              เดือนที่ {inspectedPoint.monthIdx} · {inspectedPoint.label}
            </div>
            <div className="flex flex-wrap items-center gap-5 tabular-nums">
              <span className="text-teal-700 font-medium">
                Avalanche: {formatTHB(inspectedPoint.avalanche)}
              </span>
              <span className="text-sky-700 font-medium">
                Snowball: {formatTHB(inspectedPoint.snowball)}
              </span>
              <span className="text-slate-600">
                ขั้นต่ำ: {formatTHB(inspectedPoint.minimum)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface CashflowAllocationChartProps {
  totalIncome: number;
  totalExpenses: number;
  totalMinDebt: number;
  extraBudget: number;
}

export const CashflowAllocationChart: React.FC<CashflowAllocationChartProps> = ({
  totalIncome,
  totalExpenses,
  totalMinDebt,
  extraBudget,
}) => {
  const base = Math.max(
    totalIncome,
    totalExpenses + totalMinDebt + extraBudget,
    1
  );
  const remainingBuffer = Math.max(
    0,
    totalIncome - totalExpenses - totalMinDebt - extraBudget
  );

  const segments = [
    {
      label: 'ค่าใช้จ่ายจำเป็น',
      value: totalExpenses,
      color: 'bg-slate-600',
      dot: 'bg-slate-600',
    },
    {
      label: 'ชำระหนี้ขั้นต่ำ',
      value: totalMinDebt,
      color: 'bg-amber-500',
      dot: 'bg-amber-500',
    },
    {
      label: 'งบโปะหนี้เพิ่ม',
      value: extraBudget,
      color: 'bg-teal-600',
      dot: 'bg-teal-600',
    },
    {
      label: 'เงินออม / เหลือใช้',
      value: remainingBuffer,
      color: 'bg-emerald-400',
      dot: 'bg-emerald-400',
    },
  ];

  const isOverBudget = totalExpenses + totalMinDebt + extraBudget > totalIncome;

  return (
    <div className="space-y-4">
      <div className="flex h-5 w-full overflow-hidden rounded-md bg-slate-100">
        {segments.map((seg) => {
          const pct = (seg.value / base) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.label}
              style={{ width: `${pct}%` }}
              className={`${seg.color} transition-all duration-200`}
              title={`${seg.label}: ${formatTHB(seg.value)}`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((seg) => {
          const pct = totalIncome > 0 ? (seg.value / totalIncome) * 100 : 0;
          return (
            <div key={seg.label} className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`inline-block h-2 w-2 rounded-xs ${seg.dot}`} />
                <span className="truncate">{seg.label}</span>
              </div>
              <div className="font-mono-num text-sm font-semibold text-slate-900 tabular-nums">
                {formatTHB(seg.value)}
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {pct.toFixed(1)}% ของรายได้
              </div>
            </div>
          );
        })}
      </div>

      {isOverBudget && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
          คำเตือนกระแสเงินสด: ยอดรายจ่ายจำเป็นและยอดผ่อนหนี้รวมสูงกว่ารายได้ต่อเดือน{' '}
          <span className="font-semibold tabular-nums">
            {formatTHB(totalExpenses + totalMinDebt + extraBudget - totalIncome)}
          </span>{' '}
          ควรปรับลดงบโปะเพิ่มหรือลดรายจ่ายจำเป็นเพื่อไม่ให้ขาดสภาพคล่อง
        </div>
      )}
    </div>
  );
};

interface DebtCompositionChartProps {
  debts: DebtItem[];
}

export const DebtCompositionChart: React.FC<DebtCompositionChartProps> = ({
  debts,
}) => {
  const active = useMemo(
    () =>
      [...debts]
        .filter((d) => d.principal > 0)
        .sort((a, b) => b.principal - a.principal),
    [debts]
  );

  const totalPrincipal = active.reduce((s, d) => s + d.principal, 0);
  const totalMonthlyInterest = active.reduce(
    (s, d) => s + getMonthlyInterestEstimate(d),
    0
  );

  if (active.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        ไม่มีหนี้สินคงค้างในระบบ
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs text-slate-500">
        <span>รายการหนี้สิน (เรียงตามเงินต้นคงเหลือ)</span>
        <span className="tabular-nums">
          ดอกเบี้ยรวม ~{formatTHB(totalMonthlyInterest)}/เดือน
        </span>
      </div>
      <div className="space-y-3">
        {active.map((d) => {
          const share = totalPrincipal > 0 ? (d.principal / totalPrincipal) * 100 : 0;
          const monthlyInt = getMonthlyInterestEstimate(d);
          const rateBadgeColor =
            d.annualRate >= 20
              ? 'bg-rose-600'
              : d.annualRate >= 10
                ? 'bg-amber-500'
                : 'bg-teal-600';

          return (
            <div key={d.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <div className="min-w-0 truncate font-medium text-slate-800">
                  {d.name}
                  <span className="ml-2 font-normal text-slate-500">
                    ({d.annualRate.toFixed(1)}%/ปี)
                  </span>
                </div>
                <div className="shrink-0 font-mono-num text-slate-900 tabular-nums">
                  {formatTHB(d.principal)}
                  <span className="ml-2 text-slate-500">
                    · ดอก {formatTHB(monthlyInt)}/ด.
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-100">
                <div
                  className={`h-full ${rateBadgeColor} transition-all duration-200`}
                  style={{ width: `${Math.max(2, share)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
