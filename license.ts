export type LicenseKind = "trial" | "license" | "unlimited";

export type LicenseState = {
  kind: LicenseKind;
  expiresAt: number;
  daysLeft: number;
  expired: boolean;
  configured: boolean;
};

type ApiState = {
  kind: "trial" | "license";
  expiresAt: number;
  daysLeft: number;
  expired: boolean;
};

type ApiResponse = { token: string; state: ApiState };

const STORAGE_KEY = "nb_license_v1";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

function readToken(): string | undefined {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function writeToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Storage unavailable (e.g. private browsing); the session still works.
  }
}

function toState(state: ApiState, configured = true): LicenseState {
  return {
    kind: state.kind,
    expiresAt: state.expiresAt,
    daysLeft: state.daysLeft,
    expired: state.expired,
    configured,
  };
}

const UNLIMITED: LicenseState = {
  kind: "unlimited",
  expiresAt: 0,
  daysLeft: 9999,
  expired: false,
  configured: false,
};

export type TrialRegistration = {
  fullName: string;
  email: string;
  phone: string;
  deviceId?: string;
};

export class RegistrationRequiredError extends Error {
  constructor() {
    super("REGISTRATION_REQUIRED");
    this.name = "RegistrationRequiredError";
  }
}

export async function startTrial(reg?: TrialRegistration): Promise<LicenseState> {
  try {
    const data = await postJson<ApiResponse>("/api/license/start", {
      token: readToken(),
      fullName: reg?.fullName ?? "",
      email: reg?.email ?? "",
      phone: reg?.phone ?? "",
      deviceId: reg?.deviceId ?? "",
    });
    if (data.token) writeToken(data.token);
    return toState(data.state);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "REGISTRATION_REQUIRED") {
      throw new RegistrationRequiredError();
    }
    if (message.includes("LICENSE_SECRET")) {
      return UNLIMITED;
    }
    throw error;
  }
}

export async function activateLicenseCode(code: string, deviceId: string): Promise<LicenseState> {
  const data = await postJson<ApiResponse>("/api/license/activate", {
    code,
    token: readToken(),
    deviceId,
  });
  if (data.token) writeToken(data.token);
  return toState(data.state);
}

export function formatThaiDate(timestamp: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
