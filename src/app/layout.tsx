import type { Metadata } from "next";
import "./globals.css";
import { NotificationProvider } from "../context/NotificationContext";

export const metadata: Metadata = {
  title: "Cost Analytics - PT Batara Dharma Persada",
  description: "Sistem Cost Analytics & Pelaporan Operasional PT Batara Dharma Persada",
  icons: {
    icon: "/coa-logo-bdp.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full bg-slate-50 antialiased">
      <body className="min-h-full flex flex-col text-slate-800 bg-slate-50">
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
