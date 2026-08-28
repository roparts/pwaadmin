import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface AdminCredentials {
  username: string;
  email: string;
  mobile: string;
  passwordHash: string;
  salt: string;
  totpSecret: string;
  updatedAt: string;
}

const ADMIN_CREDENTIALS_FILE = path.join(process.cwd(), "src", "data", "admin-auth.json");

const DEFAULT_SALT = "rp_admin_salt_873918237";
const DEFAULT_HASH = hashPassword("DropPurity@Admin2026#Secure", DEFAULT_SALT);

export const DEFAULT_ADMIN: AdminCredentials = {
  username: "admin",
  email: "admin@roparts.in",
  mobile: "7979784087",
  passwordHash: DEFAULT_HASH,
  salt: DEFAULT_SALT,
  totpSecret: "ROPARTSMFASECRET",
  updatedAt: new Date().toISOString(),
};

export function hashPassword(password: string, salt: string): string {
  return crypto.createHash("sha256").update(`${password}:${salt}`).digest("hex");
}

export function loadAdminCredentials(): AdminCredentials {
  try {
    if (fs.existsSync(ADMIN_CREDENTIALS_FILE)) {
      const raw = fs.readFileSync(ADMIN_CREDENTIALS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.username && parsed.passwordHash) {
        return parsed as AdminCredentials;
      }
    }
  } catch (err) {
    console.error("Error reading admin-auth.json:", err);
  }
  return DEFAULT_ADMIN;
}

export function saveAdminCredentials(creds: Partial<AdminCredentials>): AdminCredentials {
  const current = loadAdminCredentials();
  const updated: AdminCredentials = {
    ...current,
    ...creds,
    updatedAt: new Date().toISOString(),
  };

  try {
    const dir = path.dirname(ADMIN_CREDENTIALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ADMIN_CREDENTIALS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing admin-auth.json:", err);
  }

  return updated;
}

export function verifyAdminPassword(inputPassword: string): boolean {
  const admin = loadAdminCredentials();
  const inputHash = hashPassword(inputPassword, admin.salt);
  return crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(admin.passwordHash));
}

export function updateAdminPassword(newPassword: string): boolean {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(newPassword, salt);
  saveAdminCredentials({ passwordHash, salt });
  return true;
}
