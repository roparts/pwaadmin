const MAIN_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "https://roparts.in/api/v1";
const SESSION_SECRET = process.env.SESSION_SECRET || "rp_prod_secret_key_tamper_guard_982347182937";

export async function proxyToBackend(endpoint: string, options: RequestInit = {}) {
  const url = `${MAIN_BACKEND_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-internal-admin-secret": SESSION_SECRET,
        ...(options.headers || {}),
      },
    });
    return res;
  } catch (err) {
    console.error(`Proxy error to ${url}:`, err);
    throw err;
  }
}
