import React, { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  DEBT_CATEGORY_LABELS,
  DebtCategory,
  DebtItem,
  INTEREST_TYPE_LABELS,
  ReminderSettings,
} from '../types/finance';
import {
  DueStatus,
  formatTHB,
  getCurrentMonthKey,
  getDebtDueInfo,
  getMonthlyInterestEstimate,
} from '../utils/financeMath';

interface DebtsRemindersViewProps {
  debts: DebtItem[];
  reminderSettings: ReminderSettings;
  onUpdateReminderSettings: (next: ReminderSettings) => void;
  onAddDebt: () => void;
  onEditDebt: (debt: DebtItem) => void;
  onDeleteDebt: (id: string) => void;
  onTogglePaidThisMonth: (id: string) => void;
  onApplyPaymentToBalance: (id: string, paymentAmount: number) => void;
  onPayFullDebt: (id: string) => void;
  onSwipeCreditCard: (id: string, swipeAmount: number, recalcMin: boolean) => void;
}

const STATUS_ORDER: Record<DueStatus, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  upcoming: 3,
  paid: 4,
};

export const DebtsRemindersView: React.FC<DebtsRemindersViewProps> = ({
  debts,
  reminderSettings,
  onUpdateReminderSettings,
  onAddDebt,
  onEditDebt,
  onDeleteDebt,
  onTogglePaidThisMonth,
  onApplyPaymentToBalance,
  onPayFullDebt,
  onSwipeCreditCard,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<DebtCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [swipeTargetId, setSwipeTargetId] = useState<string | null>(null);
  const [swipeInputAmount, setSwipeInputAmount] = useState<number>(1500);
  const [swipeRecalcMin, setSwipeRecalcMin] = useState<boolean>(true);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);

  const currentMonthKey = getCurrentMonthKey();

  const enrichedDebts = useMemo(() => {
    return debts
      .map((debt) => ({
        debt,
        due: getDebtDueInfo(debt, reminderSettings.leadDays),
        monthlyInterest: getMonthlyInterestEstimate(debt),
      }))
      .sort((a, b) => {
        const ordDiff = STATUS_ORDER[a.due.status] - STATUS_ORDER[b.due.status];
        if (ordDiff !== 0) return ordDiff;
        return a.due.daysDiff - b.due.daysDiff;
      });
  }, [debts, reminderSettings.leadDays]);

  const filteredDebts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedDebts.filter(({ debt }) => {
      if (categoryFilter !== 'all' && debt.category !== categoryFilter) {
        return false;
      }
      if (q && !debt.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [enrichedDebts, categoryFilter, searchQuery]);

  const counts = useMemo(() => {
    let overdue = 0;
    let dueSoonOrToday = 0;
    let paid = 0;
    let upcomingTotalAmount = 0;
    for (const { debt, due } of enrichedDebts) {
      if (debt.principal <= 0) continue;
      if (due.status === 'overdue') {
        overdue++;
        upcomingTotalAmount += debt.minPayment;
      } else if (due.status === 'today' || due.status === 'soon') {
        dueSoonOrToday++;
        upcomingTotalAmount += debt.minPayment;
      } else if (due.status === 'paid') {
        paid++;
      } else {
        upcomingTotalAmount += debt.minPayment;
      }
    }
    return { overdue, dueSoonOrToday, paid, upcomingTotalAmount };
  }, [enrichedDebts]);

  const handleToggleBrowserNotifications = async () => {
    if (reminderSettings.browserNotificationsEnabled) {
      onUpdateReminderSettings({
        ...reminderSettings,
        browserNotificationsEnabled: false,
      });
      setNotifFeedback('ปิดการแจ้งเตือนผ่านเบราว์เซอร์แล้ว');
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifFeedback('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdateReminderSettings({
          ...reminderSettings,
          browserNotificationsEnabled: true,
        });
        setNotifFeedback('เปิดใช้งานการแจ้งเตือนวันครบกำหนดชำระเรียบร้อย');
        const urgentCount = counts.overdue + counts.dueSoonOrToday;
        if (urgentCount > 0) {
          new Notification('PlodNee Planner · แจ้งเตือนครบกำหนดชำระ', {
            body: `คุณมีหนี้ ${urgentCount} รายการที่ใกล้ครบกำหนดหรือเลยกำหนดในเดือนนี้`,
          });
        }
      } else {
        setNotifFeedback(
          'ไม่ได้รับอนุญาตแจ้งเตือนจากเบราว์เซอร์ ระบบจะแสดงแถบแจ้งเตือนภายในแอปให้แทน'
        );
      }
    } catch {
      setNotifFeedback(
        'ไม่สามารถเปิดแจ้งเตือนระดับเบราว์เซอร์ได้ในโหมดนี้ ระบบจะแจ้งเตือนภายในหน้าแอป'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Reminder Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              ศูนย์แจ้งเตือนวันครบกำหนดชำระหนี้ประจำเดือน
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              เลยกำหนด {counts.overdue} รายการ · ครบกำหนดวันนี้/ใกล้ถึง{' '}
              {counts.dueSoonOrToday} รายการ · ชำระแล้วเดือนนี้ {counts.paid} รายการ ·
              ยอดค้างชำระงวดนี้รวม {formatTHB(counts.upcomingTotalAmount)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>แจ้งเตือนล่วงหน้า:</span>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {[3, 5, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      onUpdateReminderSettings({ ...reminderSettings, leadDays: d })
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      reminderSettings.leadDays === d
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d} วัน
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleBrowserNotifications}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                reminderSettings.browserNotificationsEnabled
                  ? 'border-teal-600 bg-teal-50 text-teal-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              {reminderSettings.browserNotificationsEnabled
                ? 'เปิดแจ้งเตือนเบราว์เซอร์อยู่'
                : 'เปิดแจ้งเตือนเบราว์เซอร์'}
            </button>
          </div>
        </div>

        {notifFeedback && (
          <p className="mt-3 text-xs text-slate-600">{notifFeedback}</p>
        )}
      </div>

      {/* Debt Ledger Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเจ้าหนี้ / บัตร / สินเชื่อ..."
              className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onAddDebt}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-700 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มรายการหนี้สิน
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-6 py-2.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ทุกช่องทาง ({debts.length})
          </button>
          {(Object.keys(DEBT_CATEGORY_LABELS) as DebtCategory[]).map((cat) => {
            const count = debts.filter((d) => d.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {DEBT_CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>

        {filteredDebts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            ไม่พบรายการหนี้สินที่ตรงกับเงื่อนไข
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">รายการหนี้สิน / ประเภท</th>
                  <th className="px-4 py-3 text-right">เงินต้นคงเหลือ</th>
                  <th className="px-4 py-3 text-right">ดอกเบี้ย/ปี</th>
                  <th className="px-4 py-3 text-right">ดอกเบี้ย/เดือน</th>
                  <th className="px-4 py-3 text-right">ขั้นต่ำ/เดือน</th>
                  <th className="px-4 py-3">วันครบกำหนดและสถานะ</th>
                  <th className="px-6 py-3 text-right">จัดการงวดนี้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebts.map(({ debt, due, monthlyInterest }) => {
                  const isPaid = debt.paidMonths.includes(currentMonthKey);
                  const statusTone =
                    due.status === 'overdue'
                      ? 'text-rose-700 font-semibold'
                      : due.status === 'today' || due.status === 'soon'
                        ? 'text-amber-700 font-semibold'
                        : due.status === 'paid'
                          ? 'text-emerald-700 font-medium'
                          : 'text-slate-600';

                  return (
                    <tr key={debt.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-slate-900">{debt.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {DEBT_CATEGORY_LABELS[debt.category]} ·{' '}
                          {INTEREST_TYPE_LABELS[debt.interestType]}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-semibold text-slate-900 tabular-nums">
                        {formatTHB(debt.principal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-xs text-slate-700 tabular-nums">
                        {debt.annualRate.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-xs text-slate-600 tabular-nums">
                        {formatTHB(monthlyInterest)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-medium text-slate-800 tabular-nums">
                        {formatTHB(debt.minPayment)}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className={statusTone}>{due.statusLabel}</div>
                        <div className="text-slate-400">
                          ชำระทุกวันที่ {debt.dueDay} ของเดือน
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onTogglePaidThisMonth(debt.id)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                              isPaid
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isPaid && <Check className="h-3.5 w-3.5" />}
                            {isPaid ? 'จ่ายแล้ว' : 'เช็กจ่ายงวดนี้'}
                          </button>
                          {debt.category === 'credit_card' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSwipeTargetId(
                                  swipeTargetId === debt.id ? null : debt.id
                                );
                                setSwipeInputAmount(1500);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                            >
                              + รูดเพิ่ม
                            </button>
                          )}
                          {debt.principal > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onApplyPaymentToBalance(debt.id, debt.minPayment)
                                }
                                title="หักยอดเงินต้นคงเหลือลงตามยอดขั้นต่ำงวดนี้"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50 whitespace-nowrap"
                              >
                                จ่ายขั้นต่ำ
                              </button>
                              <button
                                type="button"
                                onClick={() => onPayFullDebt(debt.id)}
                                title="ชำระเต็มจำนวนเพื่อปิดยอดนี้เป็น 0 บาท"
                                className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 whitespace-nowrap"
                              >
                                จ่ายเต็ม
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditDebt(debt)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`แก้ไข ${debt.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDebt(debt.id)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`ลบ ${debt.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {swipeTargetId === debt.id && (
                          <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-2.5 text-xs">
                            <span className="text-slate-600">ยอดรูดบัตรเพิ่ม (บาท):</span>
                            <input
                              type="number"
                              min={1}
                              value={swipeInputAmount}
                              onChange={(e) =>
                                setSwipeInputAmount(Number(e.target.value) || 0)
                              }
                              className="w-28 rounded-md border border-slate-200 px-2 py-1 text-right font-mono-num tabular-nums focus:border-teal-600 focus:outline-none"
                            />
                            <label className="flex items-center gap-1 text-slate-600">
                              <input
                                type="checkbox"
                                checked={swipeRecalcMin}
                                onChange={(e) => setSwipeRecalcMin(e.target.checked)}
                                className="h-3.5 w-3.5 accent-teal-600"
                              />
                              อัปเดตขั้นต่ำ 8%
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (swipeInputAmount > 0) {
                                  onSwipeCreditCard(
                                    debt.id,
                                    swipeInputAmount,
                                    swipeRecalcMin
                                  );
                                  setSwipeTargetId(null);
                                }
                              }}
                              className="rounded-md bg-teal-600 px-2.5 py-1 font-medium text-white hover:bg-teal-700"
                            >
                              บันทึกยอดรูด
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
