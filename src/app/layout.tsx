import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROParts.in — Master Admin & Dispatch Console",
  description: "High-security Operations and Dispatch Panel for ROParts.in protected by Fixed Google Authenticator MFA",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
