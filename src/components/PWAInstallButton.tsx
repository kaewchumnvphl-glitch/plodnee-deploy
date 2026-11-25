import { useCallback, useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * ปุ่มติดตั้งแอปแบบ PWA (Add to Home Screen).
 * - Android/Chrome: แสดงปุ่มเมื่อเบราว์เซอร์พร้อมให้ติดตั้ง
 * - iOS Safari: แสดงปุ่มแนะนำให้กดแชร์ > เพิ่มที่หน้าจอโฮม (เพราะ iOS ไม่รองรับ beforeinstallprompt)
 * - เมื่อติดตั้งแล้ว ปุ่มจะหายไปอัตโนมัติ
 */
export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } catch {
      // Ignore install errors
    }
  }, [deferredPrompt]);

  if (isInstalled) return null;

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIosGuideOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer shrink-0"
        >
          <Share2 className="h-3.5 w-3.5 text-slate-400" />
          ติดตั้งแอป
        </button>
        {iosGuideOpen && (
          <div className="mt-2 text-xs text-slate-500 text-center max-w-xs whitespace-pre-line">
            กดปุ่มแชร์ (ลูกศรขึ้นจากกล่อง) แล้วเลือก “เพิ่มที่หน้าจอโฮม”
          </div>
        )}
      </>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors shrink-0 cursor-pointer"
    >
      <Download className="h-3.5 w-3.5" />
      ติดตั้งแอป
    </button>
  );
}
