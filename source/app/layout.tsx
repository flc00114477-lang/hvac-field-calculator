import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "總冷量計算機｜HVAC 現場工具",
  description: "輸入入風、出風、濕度及風量，即時計算總冷量、顯熱、潛熱及冷凝水量。",
  appleWebApp: {
    capable: true,
    title: "冷量計算機",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/hvac-field-calculator/favicon.svg",
    shortcut: "/hvac-field-calculator/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f7f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
