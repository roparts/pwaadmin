import crypto from "crypto";
import QRCode from "qrcode";

export const FIXED_ADMIN_TOTP_SECRET =
  process.env.ADMIN_TOTP_SECRET || "ROPARTSMFASECRET";

export const ADMIN_ISSUER = "ROParts.in";
export const ADMIN_ACCOUNT = "admin@roparts.in";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpCode(
  secret: string = FIXED_ADMIN_TOTP_SECRET,
  timestampMs: number = Date.now()
): string {
  const secretBuffer = base32Decode(secret);
  const epochStep = Math.floor(timestampMs / 1000 / 30);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(epochStep), 0);

  const hmac = crypto.createHmac("sha1", secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binaryCode % 1000000;
  return otp.toString().padStart(6, "0");
}

export function verifyTotpCode(
  inputCode: string,
  secret: string = FIXED_ADMIN_TOTP_SECRET,
  toleranceSteps: number = 1
): boolean {
  const cleanInput = String(inputCode || "").trim().replace(/\D/g, "");
  if (cleanInput.length !== 6) return false;

  const now = Date.now();
  for (let step = -toleranceSteps; step <= toleranceSteps; step++) {
    const checkTime = now + step * 30 * 1000;
    const generated = generateTotpCode(secret, checkTime);
    if (crypto.timingSafeEqual(Buffer.from(cleanInput), Buffer.from(generated))) {
      return true;
    }
  }

  return false;
}

export function getOtpAuthUri(
  secret: string = FIXED_ADMIN_TOTP_SECRET,
  account: string = ADMIN_ACCOUNT,
  issuer: string = ADMIN_ISSUER
): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export async function generateQrCodeDataUrl(
  secret: string = FIXED_ADMIN_TOTP_SECRET,
  account: string = ADMIN_ACCOUNT,
  issuer: string = ADMIN_ISSUER
): Promise<string> {
  const uri = getOtpAuthUri(secret, account, issuer);
  try {
    return await QRCode.toDataURL(uri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 260,
      color: {
        dark: "#1a365d",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR Code error:", err);
    return "";
  }
}
