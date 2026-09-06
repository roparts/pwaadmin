import crypto from "crypto";

function getBackendUrl(): string {
  // Production: route admin operations directly to API domain (or fallback gateway)
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const prodUrl =
      process.env.API_GATEWAY_URL ||
      process.env.API_BACKEND_URL ||
      "https://admin-api.roparts.in";
    return prodUrl.startsWith("http") ? prodUrl : `https://${prodUrl}`;
  }
  // Local development: use NEXT_PUBLIC_API_URL or localhost:3000
  const devUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
  return devUrl.startsWith("http") ? devUrl : `http://${devUrl}`;
}

const MAIN_BACKEND_URL = getBackendUrl();
const SESSION_SECRET = process.env.SESSION_SECRET || "rp_prod_secret_key_tamper_guard_982347182937";
const ADMIN_SERVICE_SECRET = process.env.ADMIN_SERVICE_SECRET || "rp_service_sec_8f934ha981bdf934810293847102938471";

export async function proxyToBackend(endpoint: string, options: RequestInit = {}) {
  const url = `${MAIN_BACKEND_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  const timestamp = Date.now().toString();
  const method = (options.method || "GET").toUpperCase();
  const bodyStr = typeof options.body === "string" ? options.body : "";
  const bodyHash = crypto.createHash("sha256").update(bodyStr).digest("hex");
  const signPayload = `${method}:${endpoint}:${timestamp}:${bodyHash}`;
  const signature = crypto.createHmac("sha256", ADMIN_SERVICE_SECRET).update(signPayload).digest("hex");

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-internal-admin-secret": SESSION_SECRET,
        "x-roparts-signature": signature,
        "x-roparts-timestamp": timestamp,
        ...(options.headers || {}),
      },
    });
    return res;
  } catch (err) {
    console.error(`Proxy error to ${url}:`, err);
    throw err;
  }
}

/**
 * Small function to clear live website cache when price/product is updated from admin
 */
export async function clearLiveStorefrontCache(slug?: string): Promise<boolean> {
  try {
    const storefrontUrl =
      process.env.NEXT_PUBLIC_STOREFRONT_URL ||
      (process.env.NODE_ENV === "production" || process.env.VERCEL
        ? "https://roparts.in"
        : "http://localhost:3000");
    const res = await fetch(`${storefrontUrl}/api/v1/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    return res.ok;
  } catch (err) {
    console.warn("clearLiveStorefrontCache warning:", err);
    return false;
  }
}
