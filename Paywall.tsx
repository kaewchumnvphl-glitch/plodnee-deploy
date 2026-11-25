import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  CreditCard,
  Download,
  KeyRound,
  Loader2,
  Lock,
  MessageCircle,
} from "lucide-react";
import { PAYMENT_CONFIG } from "../config/payment";
import { activateLicenseCode, formatThaiDate } from "../lib/license";
import { getDeviceId } from "../lib/device";
import { buildPromptPayPayload } from "../lib/promptpay";
import type { LicenseState } from "../lib/license";

type PaywallProps = {
  state: LicenseState;
  onActivated: (state: LicenseState) => void;
};

export function Paywall({ state, onActivated }: PaywallProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrPayload = useMemo(
    () => buildPromptPayPayload(PAYMENT_CONFIG.promptPayId, PAYMENT_CONFIG.priceThb),
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = code.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await activateLicenseCode(value, getDeviceId());
      onActivated(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปิดใช้งานไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            {PAYMENT_CONFIG.productName}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            พื้นที่สมาชิก
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Download className="w-4 h-4 text-blue-700" />
                ติดตั้งแอป (PWA) ก่อนใช้งาน
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
                <li>เปิดแอปผ่านเบราว์เซอร์ (Chrome / Edge / Safari)</li>
                <li>กดปุ่ม Install / Add to Home Screen ของเบราว์เซอร์</li>
                <li>เริ่มใช้งานได้เลย — เมื่อไม่มีอินเทอร์เน็ตระบบจะใช้ cache ของ app shell ให้ offline</li>
              </ol>
              <p className="text-xs text-slate-500 leading-relaxed">
                แนะนำ: ใช้บนหน้าจอมือถือ (mobile) เพื่อประสบการณ์ offline ที่ดีที่สุด
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-800 px-3 py-1 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              ทดลองใช้สิ้นสุดแล้ว
            </span>
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-snug">
                ทดลองใช้ฟรี {PAYMENT_CONFIG.trialDays} วันสิ้นสุดแล้ว
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                สมัครสมาชิก {PAYMENT_CONFIG.productName} เพียง{" "}
                <span className="font-semibold text-slate-900">
                  {PAYMENT_CONFIG.priceThb} บาท/{PAYMENT_CONFIG.periodLabel}
                </span>{" "}
                เพื่อวางแผนปลดหนี้ต่อได้ไม่จำกัด พร้อมข้อมูลที่บันทึกไว้ในเครื่องของคุณ
              </p>
              {state.kind === "license" && state.expiresAt > 0 && (
                <p className="text-xs text-slate-500">
                  สมาชิกเดิมหมดอายุเมื่อ {formatThaiDate(state.expiresAt)}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CreditCard className="w-4 h-4 text-blue-700" />
                ช่องทางชำระเงิน
              </div>
              {qrPayload && (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:gap-5">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shrink-0">
                    <QRCodeSVG value={qrPayload} size={160} level="M" includeMargin={false} />
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <p className="text-sm font-semibold text-slate-900">สแกนเพื่อชำระเงิน (PromptPay)</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {PAYMENT_CONFIG.priceThb} บาท<span className="text-sm font-medium text-slate-500">/{PAYMENT_CONFIG.periodLabel}</span>
                    </p>
                    <p className="text-xs text-slate-500">PromptPay: {PAYMENT_CONFIG.promptPayId}</p>
                    <p className="text-xs text-slate-500">{PAYMENT_CONFIG.accountName}</p>
                  </div>
                </div>
              )}
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">พร้อมเพย์ (PromptPay)</dt>
                  <dd className="font-medium text-slate-900">{PAYMENT_CONFIG.promptPayId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">ชื่อบัญชี</dt>
                  <dd className="font-medium text-slate-900">{PAYMENT_CONFIG.accountName}</dd>
                </div>
                {PAYMENT_CONFIG.bankName && (
                  <div>
                    <dt className="text-xs text-slate-500">{PAYMENT_CONFIG.bankName}</dt>
                    <dd className="font-medium text-slate-900">{PAYMENT_CONFIG.accountNumber}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-slate-500">LINE</dt>
                  <dd className="font-medium text-slate-900">{PAYMENT_CONFIG.lineId}</dd>
                </div>
              </dl>
              <p className="text-xs text-slate-500 leading-relaxed">
                {PAYMENT_CONFIG.contactNote}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {PAYMENT_CONFIG.paymentNote}
              </p>
            </div>
          </section>

          <section className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 lg:sticky lg:top-6"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <KeyRound className="w-4 h-4 text-blue-700" />
                เปิดใช้งานสมาชิก
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-500">รหัสเปิดใช้งาน</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="PN-30-20270315-7QK2-9F3A1C7B"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase tracking-wide focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              {error && (
                <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
              )}
              <button
                type="submit"
                disabled={busy || code.trim().length < 4}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    เปิดใช้งาน
                  </>
                )}
              </button>
              <p className="flex items-start gap-1.5 text-xs text-slate-500 leading-relaxed">
                <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                ได้รับรหัสจากทีมงานหลังชำระเงินแล้ว กรอกรหัสที่นี่เพื่อเปิดใช้งานทันที
              </p>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
