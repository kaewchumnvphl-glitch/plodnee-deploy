const STORAGE_KEY = "nb_device_id_v1";

function fallbackDeviceId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * ลูกค้า/ผู้ใช้ได้รับ deviceId ของเครื่อง (browser) เพื่อใช้ล็อกสิทธิ์ใช้งาน
 * (trial หรือ license) ให้ผูกกับเครื่องเดียวกัน
 */
export function getDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.trim().length >= 8) {
      return existing.trim();
    }
    const created = fallbackDeviceId();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return fallbackDeviceId();
  }
}

export function resetDeviceId(): string {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return getDeviceId();
}
