import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Empresa – Plataforma B2B Multi-Tenant",
  description: "Painel administrativo e portal do cliente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
