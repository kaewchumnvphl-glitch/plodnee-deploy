import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Check, Copy, KeyRound, Loader2, MessageSquare, Send, ShieldCheck, Activity } from "lucide-react";

const DURATIONS = [30, 90, 365] as const;

type GenerateResponse = {
  codes?: string[];
  days?: number;
  error?: string;
};

type FeedbackEntry = {
  id: string;
  text: string;
  createdAt: number;
  deviceId?: string;
};

type LicenseEventEntry = {
  id: string;
  event: string;
  createdAt: number;
  deviceId?: string;
};

export function AdminPanel() {
  const [adminPassword, setAdminPassword] = useState("");
  const [days, setDays] = useState<number>(30);
  const [count, setCount] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // ---- Feedback จากลูกค้า ----
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadFeedbacks = async () => {
    try {
      const res = await fetch(`/api/feedback?adminPassword=${encodeURIComponent(adminPassword)}`);
      const data = (await res.json().catch(() => ({}))) as { feedbacks?: FeedbackEntry[] };
      setFeedbacks(data.feedbacks || []);
    } catch {
      setFeedbacks([]);
    }
  };

  // ---- License usage events ----
  const [events, setEvents] = useState<LicenseEventEntry[]>([]);

  const loadEvents = async () => {
    try {
      const res = await fetch(`/api/license/events?adminPassword=${encodeURIComponent(adminPassword)}`);
      const data = (await res.json().catch(() => ({}))) as { events?: LicenseEventEntry[] };
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    }
  };

  type CombinedItem = {
    id: string;
    type: "feedback" | "event";
    createdAt: number;
    deviceId?: string;
    text: string;
  };

  const combined = useMemo<CombinedItem[]>(() => {
    const fbItems: CombinedItem[] = (feedbacks || []).map((f) => ({
      id: `fb-${f.id}`,
      type: "feedback" as const,
      createdAt: f.createdAt,
      deviceId: f.deviceId,
      text: f.text,
    }));
    const evItems: CombinedItem[] = (events || []).map((e) => ({
      id: `ev-${e.id}`,
      type: "event" as const,
      createdAt: e.createdAt,
      deviceId: e.deviceId,
      text: e.event,
    }));
    return [...fbItems, ...evItems].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  }, [feedbacks, events]);

  useEffect(() => {
    if (!adminPassword) return;
    const poll = async () => {
      await Promise.all([loadFeedbacks(), loadEvents()]);
    };
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [adminPassword]);

  async function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedbackBusy) return;
    setFeedbackBusy(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: feedbackText }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setFeedbackText("");
      setFeedbackMsg(data.id ? `บันทึกความคิดเห็นแล้ว (id: ${data.id.slice(0, 8)})` : "บันทึกความคิดเห็นแล้ว");
      await loadFeedbacks();
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setFeedbackBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setCodes([]);
    try {
      const response = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword, days, count }),
      });
      const data = (await response.json().catch(() => ({}))) as GenerateResponse;
      if (!response.ok) {
        throw new Error(data.error || "สร้างรหัสไม่สำเร็จ");
      }
      setCodes(data.codes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างรหัสไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("คัดลอกอัตโนมัติไม่สำเร็จ กรุณาคัดลอกด้วยมือ");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <header className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">PlodNee Planner · ผู้ดูแลระบบ</h1>
            <p className="text-xs text-slate-400">
              หน้านี้สำหรับเจ้าของเท่านั้น ใช้สร้างรหัสเปิดใช้งานให้ลูกค้า
            </p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4"
        >
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-400">รหัสผ่านผู้ดูแล (ADMIN_SECRET)</span>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="กรอกรหัสผ่านผู้ดูแล"
              autoComplete="current-password"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400">อายุรหัส</span>
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                {DURATIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} วัน
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs text-slate-400">จำนวนรหัส (1-50)</span>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || !adminPassword}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังสร้างรหัส...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                สร้างรหัสเปิดใช้งาน
              </>
            )}
          </button>
        </form>

        {codes.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-200">
                รหัสที่สร้างแล้ว ({codes.length} รหัส · อายุ {days} วัน)
              </h2>
              <button
                type="button"
                onClick={() => copyText(codes.join("\n"))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                <Copy className="h-3.5 w-3.5" />
                คัดลอกทั้งหมด
              </button>
            </div>
            <ul className="space-y-2">
              {codes.map((code) => (
                <li
                  key={code}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <code className="font-mono text-sm tracking-wide text-emerald-300">{code}</code>
                  <button
                    type="button"
                    onClick={() => copyText(code)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    {copied === code ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        คัดลอกแล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        คัดลอก
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              ส่งรหัสให้ลูกค้าทาง LINE หลังได้รับชำระเงิน รหัสแต่ละใบใช้เปิดใช้งานได้จนถึงวันหมดอายุของรหัส (ใช้ซ้ำได้)
              และมีวันหมดอายุของตัวเอง
            </p>
          </section>
        )}

        {/* ---- ระบบ Feedback จากลูกค้า ---- */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Feedback จากลูกค้า ({feedbacks.length})</h2>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-2">
            <textarea
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="ลูกค้าแจ้งความคิดเห็นอะไรสำหรับพัฒนาแอปได้ตรงนี้"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={feedbackBusy || !feedbackText.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {feedbackBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                ส่งความคิดเห็น
              </button>
              {feedbackMsg && <p className="text-xs text-emerald-400">{feedbackMsg}</p>}
            </div>
          </form>

          {feedbacks.length > 0 && (
            <ul className="space-y-2">
              {feedbacks.slice(0, 50).map((fb) => (
                <li key={fb.id} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                  <p className="text-sm text-slate-200">{fb.text}</p>
                  <p className="text-xs text-slate-600">
                    {new Date(fb.createdAt).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                    {fb.deviceId && <span className="ml-2 font-mono">dev: {fb.deviceId}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- License usage events ---- */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Event การใช้งานล่าสุด ({events.length})</h2>
          </div>

          {events.length > 0 && (
            <ul className="space-y-2">
              {events.slice(0, 50).map((ev) => (
                <li key={ev.id} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-blue-300">{ev.event}</span>
                    <span className="text-xs text-slate-600">
                      {new Date(ev.createdAt).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </span>
                  </div>
                  {ev.deviceId && (
                    <p className="mt-1 text-[11px] text-slate-500 font-mono">device: {ev.deviceId}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Combined: Feedback + Events ---- */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">Feedback & Events รวมกัน ({combined.length})</h2>
          </div>

          {combined.length > 0 ? (
            <ul className="space-y-2">
              {combined.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        item.type === "feedback" ? "bg-amber-500/15 text-amber-300" : "bg-blue-500/15 text-blue-300"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-xs text-slate-600">
                      {new Date(item.createdAt).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{item.text}</p>
                  {item.deviceId && <p className="mt-1 text-[11px] text-slate-500 font-mono">device: {item.deviceId}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">ยังไม่มีข้อมูล (รอลูกค้าโหลด/ส่ง feedback มา)</p>
          )}
        </section>

        <p className="text-xs text-slate-600">
          ตรวจสอบว่าได้ตั้งค่า ADMIN_SECRET และ LICENSE_SECRET ไว้ใน Secrets panel แล้ว
        </p>
      </div>
    </div>
  );
}
