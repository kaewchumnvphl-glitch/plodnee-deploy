import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calculator,
  CalendarClock,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  RotateCcw,
  Trash,
  Wallet,
  X,
} from 'lucide-react';
import { AnalyticsScheduleView } from './components/AnalyticsScheduleView';
import { CalculatorsView } from './components/CalculatorsView';
import { DebtsRemindersView } from './components/DebtsRemindersView';
import { EntryModal, ModalState } from './components/EntryModal';
import { IncomeExpensesView } from './components/IncomeExpensesView';
import { OverviewPlanner } from './components/OverviewPlanner';
import { createSampleData } from './data/sampleData';
import {
  DebtItem,
  ExpenseItem,
  IncomeItem,
  MainTab,
  PayoffStrategy,
  ReminderSettings,
} from './types/finance';
import {
  formatTHB,
  getCurrentMonthKey,
  getDebtDueInfo,
  getMonthlyIncomeAmount,
  getMonthlyInterestEstimate,
  simulateDebtPayoff,
} from './utils/financeMath';
import { AdminPanel } from './components/AdminPanel';
import { Paywall } from './components/Paywall';
import { TrialRegistrationGate } from './components/TrialRegistrationGate';
import { PWAInstallButton } from './components/PWAInstallButton';
import { getDeviceId } from './lib/device';
import { RegistrationRequiredError, startTrial } from './lib/license';
import type { LicenseState } from './lib/license';

const STORAGE_KEY = 'plodnee_planner_state_v1';

interface StoredState {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  debts: DebtItem[];
  extraBudget: number;
  strategy: PayoffStrategy;
  reminderSettings: ReminderSettings;
}

function loadInitialState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      if (
        Array.isArray(parsed.incomes) &&
        Array.isArray(parsed.expenses) &&
        Array.isArray(parsed.debts)
      ) {
        return {
          incomes: parsed.incomes,
          expenses: parsed.expenses,
          debts: parsed.debts,
          extraBudget:
            typeof parsed.extraBudget === 'number' ? parsed.extraBudget : 5000,
          strategy: parsed.strategy ?? 'avalanche',
          reminderSettings: parsed.reminderSettings ?? {
            leadDays: 5,
            browserNotificationsEnabled: false,
          },
        };
      }
    }
  } catch {
    // Ignore storage read errors and fall back to sample data
  }
  const sample = createSampleData();
  return {
    ...sample,
    strategy: 'avalanche',
  };
}

const NAV_ITEMS: {
  id: MainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'แผนปลดหนี้และภาพรวม', icon: LayoutDashboard },
  { id: 'cashflow', label: 'รายรับและค่าใช้จ่าย', icon: Wallet },
  { id: 'debts', label: 'รายการหนี้และแจ้งเตือน', icon: CalendarClock },
  { id: 'analytics', label: 'กราฟแนวโน้มและตารางผ่อน', icon: BarChart3 },
  { id: 'calculators', label: 'คำนวณดอกเบี้ยครบวงจร', icon: Calculator },
];

export default function App() {
  const [initial] = useState<StoredState>(() => loadInitialState());
  const [incomes, setIncomes] = useState<IncomeItem[]>(initial.incomes);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initial.expenses);
  const [debts, setDebts] = useState<DebtItem[]>(initial.debts);
  const [extraBudget, setExtraBudget] = useState<number>(initial.extraBudget);
  const [strategy, setStrategy] = useState<PayoffStrategy>(initial.strategy);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(
    initial.reminderSettings
  );

  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [toast, setToast] = useState<string | null>(null);

  // ---- Membership / license (same flow as NativeBridge) ----
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  async function trackLicenseEvent(event: string) {
    try {
      await fetch('/api/license/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, deviceId: getDeviceId() }),
      });
    } catch {
      // Do not block the app when telemetry cannot be saved.
    }
  }

  useEffect(() => {
    let cancelled = false;
    startTrial()
      .then((next) => {
        if (cancelled) return;
        setLicense(next);
        void trackLicenseEvent('trial_started');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof RegistrationRequiredError) {
          setNeedsRegistration(true);
          return;
        }
        setLicenseError(
          error instanceof Error ? error.message : 'ตรวจสอบสิทธิ์การใช้งานไม่สำเร็จ'
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const payload: StoredState = {
        incomes,
        expenses,
        debts,
        extraBudget,
        strategy,
        reminderSettings,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [incomes, expenses, debts, extraBudget, strategy, reminderSettings]);

  const showToast = (msg: string) => {
    setToast(msg);
  };

  async function sendQuickFeedback() {
    const text = window.prompt('ส่งความคิดเห็นหรือแจ้งปัญหาให้ทีมงาน')?.trim();
    if (!text) return;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 1000), deviceId: getDeviceId() }),
      });
      if (!res.ok) throw new Error('save failed');
      showToast('ส่งความคิดเห็นแล้ว ขอบคุณครับ');
    } catch {
      showToast('ส่งความคิดเห็นไม่สำเร็จ กรุณาลองใหม่');
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const totalIncome = useMemo(
    () => incomes.reduce((sum, i) => sum + getMonthlyIncomeAmount(i), 0),
    [incomes]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Math.max(0, e.amount), 0),
    [expenses]
  );
  const activeDebts = useMemo(
    () => debts.filter((d) => d.principal > 0),
    [debts]
  );
  const totalMinDebt = useMemo(
    () => activeDebts.reduce((sum, d) => sum + Math.max(0, d.minPayment), 0),
    [activeDebts]
  );

  const avalancheSim = useMemo(
    () => simulateDebtPayoff(debts, extraBudget, 'avalanche'),
    [debts, extraBudget]
  );
  const snowballSim = useMemo(
    () => simulateDebtPayoff(debts, extraBudget, 'snowball'),
    [debts, extraBudget]
  );
  const minimumSim = useMemo(
    () => simulateDebtPayoff(debts, 0, 'minimum'),
    [debts]
  );

  const urgentCount = useMemo(() => {
    return activeDebts.filter((d) => {
      const info = getDebtDueInfo(d, reminderSettings.leadDays);
      return (
        info.status === 'overdue' ||
        info.status === 'today' ||
        info.status === 'soon'
      );
    }).length;
  }, [activeDebts, reminderSettings.leadDays]);

  const handleSaveIncome = (
    item: Omit<IncomeItem, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      setIncomes((prev) =>
        prev.map((i) => (i.id === existingId ? { ...item, id: existingId } : i))
      );
      showToast('อัปเดตรายการรายได้เรียบร้อย');
    } else {
      setIncomes((prev) => [
        ...prev,
        { ...item, id: `inc-${Date.now()}` },
      ]);
      showToast('เพิ่มช่องทางรายได้เรียบร้อย');
    }
  };

  const handleSaveExpense = (
    item: Omit<ExpenseItem, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === existingId ? { ...item, id: existingId } : e))
      );
      showToast('อัปเดตค่าใช้จ่ายเรียบร้อย');
    } else {
      setExpenses((prev) => [
        ...prev,
        { ...item, id: `exp-${Date.now()}` },
      ]);
      showToast('เพิ่มค่าใช้จ่ายจำเป็นเรียบร้อย');
    }
  };

  const handleSaveDebt = (
    item: Omit<DebtItem, 'id' | 'paidMonths'>,
    existingId?: string
  ) => {
    if (existingId) {
      setDebts((prev) =>
        prev.map((d) =>
          d.id === existingId
            ? { ...d, ...item, id: existingId }
            : d
        )
      );
      showToast('อัปเดตรายการหนี้สินเรียบร้อย');
    } else {
      setDebts((prev) => [
        ...prev,
        { ...item, id: `debt-${Date.now()}`, paidMonths: [] },
      ]);
      showToast('เพิ่มหนี้สินเข้าแผนปลดหนี้เรียบร้อย');
    }
  };

  const handleTogglePaidThisMonth = (debtId: string) => {
    const monthKey = getCurrentMonthKey();
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== debtId) return d;
        const already = d.paidMonths.includes(monthKey);
        return {
          ...d,
          paidMonths: already
            ? d.paidMonths.filter((m) => m !== monthKey)
            : [...d.paidMonths, monthKey],
        };
      })
    );
  };

  const handleApplyPaymentToBalance = (debtId: string, paymentAmount: number) => {
    const monthKey = getCurrentMonthKey();
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== debtId) return d;
        const monthlyInt = getMonthlyInterestEstimate(d);
        const principalReduction = Math.max(0, paymentAmount - monthlyInt);
        const nextPrincipal = Math.max(0, Math.round(d.principal - principalReduction));
        const paidMonths = d.paidMonths.includes(monthKey)
          ? d.paidMonths
          : [...d.paidMonths, monthKey];
        return {
          ...d,
          principal: nextPrincipal,
          paidMonths,
        };
      })
    );
    showToast('บันทึกจ่ายขั้นต่ำงวดนี้และหักยอดเงินต้นคงเหลือแล้ว');
  };

  const handlePayFullDebt = (debtId: string) => {
    const monthKey = getCurrentMonthKey();
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== debtId) return d;
        const paidMonths = d.paidMonths.includes(monthKey)
          ? d.paidMonths
          : [...d.paidMonths, monthKey];
        return {
          ...d,
          principal: 0,
          paidMonths,
        };
      })
    );
    showToast('บันทึกชำระเต็มจำนวนเรียบร้อย ยอดคงเหลือเป็น 0 บาท (ไม่เสียดอกเบี้ยเพิ่ม)');
  };

  const handleSwipeCreditCard = (
    debtId: string,
    swipeAmount: number,
    recalcMin: boolean
  ) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== debtId) return d;
        const nextPrincipal = Math.max(0, d.principal + swipeAmount);
        const nextMinPayment = recalcMin
          ? Math.max(500, Math.ceil(nextPrincipal * 0.08))
          : d.minPayment;
        return {
          ...d,
          principal: nextPrincipal,
          minPayment: nextMinPayment,
        };
      })
    );
    showToast(`เพิ่มยอดรูดบัตร ${formatTHB(swipeAmount)} เข้าบิลเรียบร้อย`);
  };

  const handleResetToSample = () => {
    const sample = createSampleData();
    setIncomes(sample.incomes);
    setExpenses(sample.expenses);
    setDebts(sample.debts);
    setExtraBudget(sample.extraBudget);
    setReminderSettings(sample.reminderSettings);
    setStrategy('avalanche');
    showToast('โหลดชุดข้อมูลตัวอย่างเรียบร้อย');
  };

  const handleClearAll = () => {
    setIncomes([]);
    setExpenses([]);
    setDebts([]);
    setExtraBudget(0);
    showToast('ล้างข้อมูลทั้งหมดแล้ว สามารถเริ่มกรอกข้อมูลของคุณเองได้ทันที');
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab)!;

  const isAdminRoute = window.location.pathname.replace(/\/+$/, '').endsWith('/admin');
  if (isAdminRoute) {
    return <AdminPanel />;
  }

  if (licenseError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md space-y-2 rounded-xl border border-rose-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">
            ตรวจสอบสิทธิ์การใช้งานไม่สำเร็จ
          </p>
          <p className="text-xs text-slate-500">{licenseError}</p>
        </div>
      </div>
    );
  }

  if (needsRegistration && !license) {
    return (
      <TrialRegistrationGate
        onRegistered={(next) => {
          setLicense(next);
          setNeedsRegistration(false);
          void trackLicenseEvent('device_registered');
        }}
      />
    );
  }

  if (!license) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
        <p className="text-sm">กำลังตรวจสอบสิทธิ์การใช้งาน...</p>
      </div>
    );
  }

  if (license.kind !== 'unlimited' && license.expired) {
    return (
      <Paywall
        state={license}
        onActivated={(next) => {
          setLicense(next);
          void trackLicenseEvent('license_activated');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex h-16 items-center border-b border-slate-200 px-6">
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              PlodNee Planner
            </span>
          </div>

          <nav className="flex-1 space-y-1 p-4" aria-label="เมนูหลัก">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-teal-700' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'debts' && urgentCount > 0 && (
                    <span className="font-mono-num text-xs font-semibold text-amber-700 tabular-nums">
                      {urgentCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Compact Cashflow Summary & Data Controls */}
          <div className="space-y-4 border-t border-slate-200 p-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>รายรับต่อเดือน</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(totalIncome)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ค่าใช้จ่าย + ขั้นต่ำ</span>
                <span className="font-mono-num font-medium text-slate-900 tabular-nums">
                  {formatTHB(totalExpenses + totalMinDebt)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 font-medium">
                <span className="text-slate-700">เหลือพร้อมโปะ</span>
                <span
                  className={`font-mono-num tabular-nums ${
                    totalIncome - totalExpenses - totalMinDebt >= 0
                      ? 'text-teal-700'
                      : 'text-rose-600'
                  }`}
                >
                  {formatTHB(totalIncome - totalExpenses - totalMinDebt)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetToSample}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RotateCcw className="h-3 w-3" />
                ตัวอย่าง
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash className="h-3 w-3" />
                ล้างข้อมูล
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-950/40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 flex w-72 flex-col bg-white shadow-xl">
              <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
                <span className="text-base font-bold text-slate-900">
                  PlodNee Planner
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="ปิดเมนู"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 p-4">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-left text-xs font-medium ${
                        isActive
                          ? 'bg-teal-50 text-teal-800'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {item.id === 'debts' && urgentCount > 0 && (
                        <span className="font-mono-num text-xs font-semibold text-amber-700">
                          {urgentCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-4">
                <button
                  type="button"
                  onClick={() => {
                    handleResetToSample();
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-700"
                >
                  โหลดตัวอย่าง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClearAll();
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600"
                >
                  ล้างข้อมูล
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-8 border-b border-slate-200 bg-white px-4 sm:px-6 lg:h-16">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="เปิดเมนู"
              >
                <Menu className="h-4 w-4" />
              </button>
              <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                {activeNavMeta.label}
              </h1>
              <div className="hidden sm:block">
                <PWAInstallButton />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void sendQuickFeedback()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                title="ส่งความคิดเห็นให้ทีมงาน"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ความคิดเห็น</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setModal({
                    open: true,
                    kind: activeTab === 'cashflow' ? 'income' : 'debt',
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-700 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                เพิ่มรายการ
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
            {activeTab === 'overview' && (
              <OverviewPlanner
                debts={debts}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                totalMinDebt={totalMinDebt}
                extraBudget={extraBudget}
                onChangeExtraBudget={setExtraBudget}
                strategy={strategy}
                onChangeStrategy={setStrategy}
                avalancheSim={avalancheSim}
                snowballSim={snowballSim}
                minimumSim={minimumSim}
                reminderSettings={reminderSettings}
                onTogglePaidThisMonth={handleTogglePaidThisMonth}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenAddDebt={() => setModal({ open: true, kind: 'debt' })}
              />
            )}

            {activeTab === 'cashflow' && (
              <IncomeExpensesView
                incomes={incomes}
                expenses={expenses}
                totalMinDebt={totalMinDebt}
                extraBudget={extraBudget}
                onAddIncome={() => setModal({ open: true, kind: 'income' })}
                onEditIncome={(item) =>
                  setModal({ open: true, kind: 'income', editing: item })
                }
                onDeleteIncome={(id) =>
                  setIncomes((prev) => prev.filter((i) => i.id !== id))
                }
                onAddExpense={() => setModal({ open: true, kind: 'expense' })}
                onEditExpense={(item) =>
                  setModal({ open: true, kind: 'expense', editing: item })
                }
                onDeleteExpense={(id) =>
                  setExpenses((prev) => prev.filter((e) => e.id !== id))
                }
              />
            )}

            {activeTab === 'debts' && (
              <DebtsRemindersView
                debts={debts}
                reminderSettings={reminderSettings}
                onUpdateReminderSettings={setReminderSettings}
                onAddDebt={() => setModal({ open: true, kind: 'debt' })}
                onEditDebt={(debt) =>
                  setModal({ open: true, kind: 'debt', editing: debt })
                }
                onDeleteDebt={(id) =>
                  setDebts((prev) => prev.filter((d) => d.id !== id))
                }
                onTogglePaidThisMonth={handleTogglePaidThisMonth}
                onApplyPaymentToBalance={handleApplyPaymentToBalance}
                onPayFullDebt={handlePayFullDebt}
                onSwipeCreditCard={handleSwipeCreditCard}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsScheduleView
                debts={debts}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                totalMinDebt={totalMinDebt}
                extraBudget={extraBudget}
                strategy={strategy}
                onChangeStrategy={setStrategy}
                avalancheSim={avalancheSim}
                snowballSim={snowballSim}
                minimumSim={minimumSim}
              />
            )}

            {activeTab === 'calculators' && (
              <CalculatorsView
                onAddCalculatedDebt={(draft) => {
                  handleSaveDebt(draft);
                  setActiveTab('debts');
                }}
              />
            )}
          </main>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <EntryModal
        modal={modal}
        onClose={() => setModal({ open: false })}
        onSaveIncome={handleSaveIncome}
        onSaveExpense={handleSaveExpense}
        onSaveDebt={handleSaveDebt}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
