const MAIN_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "https://roparts.in/api/v1";

export async function proxyToBackend(endpoint: string, options: RequestInit = {}) {
  const url = `${MAIN_BACKEND_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    return res;
  } catch (err) {
    console.error(`Proxy error to ${url}:`, err);
    throw err;
  }
}
