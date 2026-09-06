function getBackendUrl(): string {
  // Production: route admin operations directly to Lambda API Gateway
  // ponytail: api.roparts.in is a CNAME to Vercel which has NO DynamoDB creds.
  // Admin writes must go straight to Lambda (IAM role gives DynamoDB access).
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const prodUrl = process.env.API_GATEWAY_URL || "https://xm6bzs5w47.execute-api.ap-south-1.amazonaws.com";
    const clean = prodUrl.startsWith("http") ? prodUrl : `https://${prodUrl}`;
    return clean.endsWith("/api/v1") ? clean : `${clean}/api/v1`;
  }
  // Local development: use NEXT_PUBLIC_API_URL or localhost:3000
  const devUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
  return devUrl.startsWith("http") ? devUrl : `http://${devUrl}`;
}

const MAIN_BACKEND_URL = getBackendUrl();
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
