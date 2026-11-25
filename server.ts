import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 10000;
const IS_DEV = process.env.NODE_ENV !== "production";

// ---------------------------------------------------------------------------
// Durable store. On Render the filesystem is ephemeral, so set
// GITHUB_STORE_TOKEN + GITHUB_STORE_REPO to persist registrations/feedback
// in a dedicated branch (never the branch Render auto-deploys).
// Falls back to a local JSON file for development / single-instance hosting.
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve(__dirname, ".plodnee-data");
const LOCAL_STORE_PATH = path.join(DATA_DIR, "store.json");
const GITHUB_STORE_TOKEN = process.env.GITHUB_STORE_TOKEN?.trim() || "";
const GITHUB_STORE_REPO = process.env.GITHUB_STORE_REPO?.trim() || "";
const GITHUB_STORE_BRANCH = process.env.GITHUB_STORE_BRANCH?.trim() || "data-store";
const GITHUB_STORE_PATH = process.env.GITHUB_STORE_PATH?.trim() || "secure-store.json";

type DurableStore = {
  trialRegistrations?: Array<{
    full_name: string;
    email: string;
    phone: string;
    ip: string;
    device_id: string;
    createdAt: number;
  }>;
  feedbacks?: Array<{ id: string; text: string; createdAt: number; deviceId?: string }>;
  licenseEvents?: Array<{ id: string; event: string; createdAt: number; deviceId?: string }>;
};

let storeBranchReady = false;
let storeWriteChain: Promise<void> = Promise.resolve();

async function githubStoreFetch(apiPath: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.github.com${apiPath}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_STORE_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function ensureStoreBranch(): Promise<boolean> {
  if (storeBranchReady) return true;
  try {
    let res = await githubStoreFetch(
      `/repos/${GITHUB_STORE_REPO}/git/ref/heads/${GITHUB_STORE_BRANCH}`,
    );
    if (res.status === 404) {
      const mainRes = await githubStoreFetch(`/repos/${GITHUB_STORE_REPO}/git/ref/heads/main`);
      if (!mainRes.ok) return false;
      const mainRef = (await mainRes.json()) as { object?: { sha?: string } };
      if (!mainRef.object?.sha) return false;
      res = await githubStoreFetch(`/repos/${GITHUB_STORE_REPO}/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${GITHUB_STORE_BRANCH}`, sha: mainRef.object.sha }),
      });
    }
    if (!res.ok) return false;
    storeBranchReady = true;
    return true;
  } catch (err) {
    console.error("GitHub store branch check failed:", err);
    return false;
  }
}

async function readLocalStore(): Promise<DurableStore> {
  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function readStore(): Promise<DurableStore> {
  if (GITHUB_STORE_TOKEN && GITHUB_STORE_REPO && (await ensureStoreBranch())) {
    try {
      const res = await githubStoreFetch(
        `/repos/${GITHUB_STORE_REPO}/contents/${GITHUB_STORE_PATH}?ref=${GITHUB_STORE_BRANCH}`,
      );
      if (res.status === 404) return {};
      if (!res.ok) return readLocalStore();
      const data = (await res.json()) as { content?: string };
      if (!data.content) return {};
      const parsed = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
      console.error("GitHub store read failed:", err);
    }
  }
  return readLocalStore();
}

async function writeStore(mutator: (store: DurableStore) => void): Promise<void> {
  storeWriteChain = storeWriteChain.then(async () => {
    const store = await readStore();
    mutator(store);
    if (GITHUB_STORE_TOKEN && GITHUB_STORE_REPO && (await ensureStoreBranch())) {
      try {
        const existing = await githubStoreFetch(
          `/repos/${GITHUB_STORE_REPO}/contents/${GITHUB_STORE_PATH}?ref=${GITHUB_STORE_BRANCH}`,
        );
        let sha: string | undefined;
        if (existing.ok) sha = ((await existing.json()) as { sha?: string }).sha;
        else if (existing.status !== 404) throw new Error(`GitHub store read: ${existing.status}`);
        const content = Buffer.from(JSON.stringify(store, null, 2), "utf-8").toString("base64");
        const res = await githubStoreFetch(
          `/repos/${GITHUB_STORE_REPO}/contents/${GITHUB_STORE_PATH}`,
          {
            method: "PUT",
            body: JSON.stringify({
              message: "Update PlodNee durable store",
              content,
              branch: GITHUB_STORE_BRANCH,
              ...(sha ? { sha } : {}),
            }),
          },
        );
        if (res.ok) return;
        console.error("GitHub store write failed:", res.status);
      } catch (err) {
        console.error("GitHub store write failed:", err);
      }
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${LOCAL_STORE_PATH}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf-8");
    await fs.rename(tmp, LOCAL_STORE_PATH);
  });
  await storeWriteChain;
}

// ---------------------------------------------------------------------------
// Licensing: 30-day trial + owner-generated activation codes.
// Codes are prefixed PN- so they never cross-work with NativeBridge codes.
// ---------------------------------------------------------------------------
const LICENSE_TRIAL_DAYS = 30;
const ACTIVATION_DURATIONS = [30, 90, 365];
const ACTIVATION_MAX_FAILURES = 5;
const ACTIVATION_FAILURE_WINDOW_MS = 10 * 60_000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const activationFailures = new Map<string, { count: number; resetAt: number }>();

type LicenseKind = "trial" | "license";
type LicensePayload = {
  v: 1;
  kind: LicenseKind;
  deviceId: string;
  issuedAt: number;
  expiresAt: number;
};

function getLicenseSecret(): string | null {
  const secret = process.env.LICENSE_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): Buffer {
  const padding = "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + padding, "base64");
}

function signLicenseToken(payload: LicensePayload, secret: string): string {
  const body = toBase64Url(
    JSON.stringify({
      v: payload.v,
      kind: payload.kind,
      deviceId: payload.deviceId,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
    }),
  );
  return `${body}.${toBase64Url(crypto.createHmac("sha256", secret).update(body).digest())}`;
}

function verifyLicenseToken(token: string, secret: string): LicensePayload | null {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = fromBase64Url(signature);
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(fromBase64Url(body).toString("utf-8")) as LicensePayload;
    if (!payload || payload.v !== 1) return null;
    if (payload.kind !== "trial" && payload.kind !== "license") return null;
    if (typeof payload.expiresAt !== "number" || typeof payload.deviceId !== "string") return null;
    if (payload.deviceId.length < 8) return null;
    return payload;
  } catch {
    return null;
  }
}

function summarizeLicense(payload: LicensePayload) {
  const now = Date.now();
  return {
    kind: payload.kind,
    deviceId: payload.deviceId,
    expiresAt: payload.expiresAt,
    daysLeft: Math.max(0, Math.ceil((payload.expiresAt - now) / 86_400_000)),
    expired: payload.expiresAt <= now,
  };
}

function activationMac(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`pn-code:${payload}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

function randomCodeChunk(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function createActivationCode(days: number, secret: string): string {
  const expiry = new Date(Date.now() + 365 * 86_400_000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const payload = `${days}-${expiry}-${randomCodeChunk(4)}`;
  return `PN-${payload}-${activationMac(payload, secret)}`;
}

function parseActivationCode(rawCode: string, secret: string): { days: number } | null {
  const code = String(rawCode || "").trim().toUpperCase().replace(/\s+/g, "");
  const match = /^PN-(\d{1,3})-(\d{8})-([A-Z0-9]{4})-([A-F0-9]{8})$/.exec(code);
  if (!match) return null;
  const days = Number(match[1]);
  if (!ACTIVATION_DURATIONS.includes(days)) return null;
  const expiry = match[2];
  const expiryAt = Date.parse(
    `${expiry.slice(0, 4)}-${expiry.slice(4, 6)}-${expiry.slice(6, 8)}T23:59:59Z`,
  );
  if (!Number.isFinite(expiryAt) || Date.now() > expiryAt) return null;
  if (activationMac(`${match[1]}-${match[2]}-${match[3]}`, secret) !== match[4]) return null;
  return { days };
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}
function normalizePhone(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 9 && digits.length <= 15;
}
function getClientIp(req: express.Request): string {
  const header = req.headers["x-forwarded-for"];
  const first = Array.isArray(header) ? header[0] : header;
  return first?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}
function isActivationRateLimited(ip: string): boolean {
  const entry = activationFailures.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    activationFailures.delete(ip);
    return false;
  }
  return entry.count >= ACTIVATION_MAX_FAILURES;
}
function recordActivationFailure(ip: string): void {
  const entry = activationFailures.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    activationFailures.set(ip, { count: 1, resetAt: Date.now() + ACTIVATION_FAILURE_WINDOW_MS });
    return;
  }
  entry.count += 1;
}
function adminPasswordOk(provided: unknown): boolean {
  const expected = process.env.ADMIN_SECRET?.trim() || "";
  if (expected.length < 8) return false;
  const a = Buffer.from(String(provided || ""));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: "1mb" }));

  app.post("/api/license/start", async (req, res) => {
    try {
      const secret = getLicenseSecret();
      if (!secret) {
        res.status(500).json({ error: "LICENSE_SECRET is not configured on the server." });
        return;
      }
      const body = req.body as {
        token?: string;
        fullName?: string;
        email?: string;
        phone?: string;
        deviceId?: string;
      };
      const deviceId = String(body?.deviceId || "").trim();
      const existing = body?.token ? verifyLicenseToken(body.token, secret) : null;
      if (existing) {
        if (existing.deviceId && deviceId && existing.deviceId !== deviceId) {
          res.status(401).json({ error: "DEVICE_MISMATCH", message: "สิทธิ์นี้ผูกกับอุปกรณ์อื่นแล้ว" });
          return;
        }
        res.json({ token: body.token, state: summarizeLicense(existing) });
        return;
      }

      const fullName = String(body?.fullName || "").trim();
      const email = normalizeEmail(body?.email || "");
      const phone = normalizePhone(body?.phone || "");
      const ip = getClientIp(req);
      if (!fullName || !email || !phone || fullName.length < 2 || fullName.length > 120) {
        res.status(400).json({ error: "REGISTRATION_REQUIRED", message: "กรุณาลงทะเบียนก่อนเริ่มทดลองใช้ฟรี" });
        return;
      }
      if (!isValidEmail(email)) {
        res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง" });
        return;
      }
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" });
        return;
      }
      if (deviceId.length < 8) {
        res.status(400).json({ error: "DEVICE_REQUIRED", message: "กรุณาเปิดแอปบนเครื่องเดิมอีกครั้ง" });
        return;
      }

      const store = await readStore();
      const rows = Array.isArray(store.trialRegistrations) ? store.trialRegistrations : [];
      if (rows.some((r) => r.email === email)) {
        res.status(409).json({ error: "อีเมลนี้เคยลงทะเบียนทดลองใช้ฟรีแล้ว" });
        return;
      }
      if (rows.some((r) => r.phone === phone)) {
        res.status(409).json({ error: "เบอร์โทรนี้เคยลงทะเบียนทดลองใช้ฟรีแล้ว" });
        return;
      }
      if (rows.some((r) => r.ip === ip)) {
        res.status(409).json({ error: "เครือข่ายนี้เคยลงทะเบียนทดลองใช้ฟรีแล้ว (1 คนต่อ 1 สิทธิ์)" });
        return;
      }
      if (rows.some((r) => r.device_id === deviceId)) {
        res.status(409).json({ error: "DEVICE_ALREADY_REGISTERED", message: "เครื่องนี้เคยลงทะเบียนแล้ว" });
        return;
      }
      await writeStore((next) => {
        const list = Array.isArray(next.trialRegistrations) ? next.trialRegistrations : [];
        next.trialRegistrations = [...list, { full_name: fullName, email, phone, ip, device_id: deviceId, createdAt: Date.now() }];
      });

      const now = Date.now();
      const payload: LicensePayload = {
        v: 1,
        kind: "trial",
        deviceId,
        issuedAt: now,
        expiresAt: now + LICENSE_TRIAL_DAYS * 86_400_000,
      };
      res.json({ token: signLicenseToken(payload, secret), state: summarizeLicense(payload) });
    } catch (err) {
      console.error("license/start failed:", err);
      res.status(500).json({ error: "เริ่มทดลองใช้ฟรีไม่สำเร็จ กรุณาลองใหม่" });
    }
  });

  app.post("/api/license/activate", (req, res) => {
    const secret = getLicenseSecret();
    if (!secret) {
      res.status(500).json({ error: "LICENSE_SECRET is not configured on the server." });
      return;
    }
    const ip = getClientIp(req);
    if (isActivationRateLimited(ip)) {
      res.status(429).json({ error: "พยายามมากเกินไป กรุณารอ 10 นาทีแล้วลองใหม่" });
      return;
    }
    const body = req.body as { code?: string; token?: string; deviceId?: string };
    const deviceId = String(body?.deviceId || "").trim();
    const parsed = parseActivationCode(body?.code || "", secret);
    if (!parsed) {
      recordActivationFailure(ip);
      res.status(400).json({ error: "รหัสเปิดใช้งานไม่ถูกต้อง หรือหมดอายุแล้ว" });
      return;
    }
    if (deviceId.length < 8) {
      res.status(400).json({ error: "DEVICE_REQUIRED", message: "กรุณาเปิดแอปบนเครื่องเดิมอีกครั้ง" });
      return;
    }
    activationFailures.delete(ip);
    const now = Date.now();
    const existing = body?.token ? verifyLicenseToken(body.token, secret) : null;
    const base = existing && existing.kind === "license" && existing.expiresAt > now ? existing.expiresAt : now;
    const payload: LicensePayload = {
      v: 1,
      kind: "license",
      deviceId,
      issuedAt: now,
      expiresAt: base + parsed.days * 86_400_000,
    };
    res.json({ token: signLicenseToken(payload, secret), state: summarizeLicense(payload) });
  });

  app.post("/api/license/verify", (req, res) => {
    const secret = getLicenseSecret();
    if (!secret) {
      res.status(500).json({ error: "LICENSE_SECRET is not configured on the server." });
      return;
    }
    const body = req.body as { token?: string; deviceId?: string };
    const deviceId = String(body?.deviceId || "").trim();
    const payload = verifyLicenseToken(body?.token || "", secret);
    if (!payload || (deviceId && payload.deviceId !== deviceId)) {
      res.status(401).json({ valid: false });
      return;
    }
    res.json({ valid: payload.expiresAt > Date.now(), state: summarizeLicense(payload) });
  });

  app.post("/api/admin/generate", (req, res) => {
    const licenseSecret = getLicenseSecret();
    if (!licenseSecret) {
      res.status(500).json({ error: "LICENSE_SECRET is not configured on the server." });
      return;
    }
    if (!process.env.ADMIN_SECRET?.trim() || process.env.ADMIN_SECRET.trim().length < 8) {
      res.status(500).json({ error: "ADMIN_SECRET is not configured on the server." });
      return;
    }
    if (!adminPasswordOk((req.body as { adminPassword?: string })?.adminPassword)) {
      res.status(401).json({ error: "รหัสผ่านผู้ดูแลไม่ถูกต้อง" });
      return;
    }
    const body = req.body as { days?: number; count?: number };
    const days = ACTIVATION_DURATIONS.includes(Number(body?.days)) ? Number(body?.days) : 30;
    const count = Math.min(50, Math.max(1, Math.floor(Number(body?.count) || 1)));
    res.json({ codes: Array.from({ length: count }, () => createActivationCode(days, licenseSecret)), days });
  });

  app.post("/api/feedback", async (req, res) => {
    const text = String((req.body as { text?: string })?.text || "").trim().slice(0, 1000);
    if (!text) {
      res.status(400).json({ error: "กรุณากรอกความคิดเห็น" });
      return;
    }
    const deviceId = String((req.body as { deviceId?: string })?.deviceId || "").slice(0, 120);
    const id = crypto.randomUUID();
    await writeStore((store) => {
      const list = Array.isArray(store.feedbacks) ? store.feedbacks : [];
      store.feedbacks = [...list, { id, text, createdAt: Date.now(), ...(deviceId ? { deviceId } : {}) }].slice(-500);
    });
    res.json({ ok: true, id });
  });

  app.get("/api/feedback", async (req, res) => {
    if (!adminPasswordOk(req.query.adminPassword)) {
      res.status(401).json({ error: "รหัสผ่านผู้ดูแลไม่ถูกต้อง" });
      return;
    }
    const store = await readStore();
    res.json({ feedbacks: Array.isArray(store.feedbacks) ? store.feedbacks.slice(-200).reverse() : [] });
  });

  app.post("/api/license/events", async (req, res) => {
    const event = String((req.body as { event?: string })?.event || "").trim().slice(0, 80);
    if (!event) {
      res.status(400).json({ error: "missing event" });
      return;
    }
    const deviceId = String((req.body as { deviceId?: string })?.deviceId || "").slice(0, 120);
    await writeStore((store) => {
      const list = Array.isArray(store.licenseEvents) ? store.licenseEvents : [];
      store.licenseEvents = [...list, { id: crypto.randomUUID(), event, createdAt: Date.now(), ...(deviceId ? { deviceId } : {}) }].slice(-500);
    });
    res.json({ ok: true });
  });

  app.get("/api/license/events", async (req, res) => {
    if (!adminPasswordOk(req.query.adminPassword)) {
      res.status(401).json({ error: "รหัสผ่านผู้ดูแลไม่ถูกต้อง" });
      return;
    }
    const store = await readStore();
    res.json({ events: Array.isArray(store.licenseEvents) ? store.licenseEvents.slice(-200).reverse() : [] });
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      app: "plodnee-planner",
      licenseConfigured: Boolean(getLicenseSecret()),
      adminConfigured: Boolean(process.env.ADMIN_SECRET?.trim()),
      durableStore: Boolean(GITHUB_STORE_TOKEN && GITHUB_STORE_REPO),
    });
  });

  if (IS_DEV) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`PlodNee Planner server listening on http://0.0.0.0:${PORT} (${IS_DEV ? "dev" : "production"})`);
  });
}

void startServer();
