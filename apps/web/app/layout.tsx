import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReparaYa - Servicios de Reparación y Mantenimiento",
  description: "Conectamos clientes con contratistas de servicios de reparación y mantenimiento del hogar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* TODO: Integrar ClerkProvider aquí */}
        {children}
      </body>
    </html>
  );
}
