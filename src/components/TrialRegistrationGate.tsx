import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, ShieldCheck, UserRound } from "lucide-react";
import { startTrial } from "../lib/license";
import { getDeviceId } from "../lib/device";
import type { LicenseState } from "../lib/license";

type Props = {
  onRegistered: (state: LicenseState) => void;
};

export function TrialRegistrationGate({ onRegistered }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();
    const tel = phone.replace(/\D/g, "");
    const devId = deviceId.trim();
    if (name.length < 2) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (tel.length < 9) {
      setError("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
      return;
    }
    if (devId.length < 8) {
      setError("ไม่สามารถสร้าง/อ่าน Device ID ได้ กรุณาลองใช้เครื่องอื่น");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const state = await startTrial({ fullName: name, email: mail, phone: tel, deviceId: devId });
      onRegistered(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">ลงทะเบียนทดลองใช้ฟรี 30 วัน</h1>
            <p className="text-xs text-slate-500">กรอกข้อมูลเพื่อเริ่มใช้งาน PlodNee Planner</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">ชื่อ-นามสกุล</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoComplete="name"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">อีเมล</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoComplete="email"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">เบอร์โทรศัพท์</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08x-xxx-xxxx"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoComplete="tel"
              required
            />
          </label>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            เริ่มทดลองใช้ฟรี 30 วัน
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          เครื่อง/อุปกรณ์ที่ลงทะเบียน (Device Lock): <span className="font-mono text-slate-700">{deviceId}</span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          ทดลองใช้ฟรี 1 สิทธิ์ต่อ 1 คน (ตรวจสอบจากอีเมล เบอร์โทร และเครือข่าย/IP) ข้อมูลใช้เพื่อยืนยันสิทธิ์และติดต่อเรื่องสมาชิกเท่านั้น
        </p>
      </div>
    </div>
  );
}
